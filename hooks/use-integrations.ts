"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  INTEGRATIONS_UPDATED,
  readLocalIntegrations,
  removeLocalIntegration,
  upsertLocalIntegration,
} from "@/lib/integrations/integrations-client-store";
import type {
  IntegrationAuthKind,
  IntegrationProviderId,
  IntegrationPublicRecord,
  IntegrationSecretPayload,
} from "@/lib/integrations/types";

type Capabilities = {
  slack: boolean;
  notion: boolean;
  google_calendar: boolean;
};

export function useIntegrations() {
  const { user, loading: authLoading } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationPublicRecord[]>([]);
  const [oauthConfigured, setOauthConfigured] = useState<Capabilities>({
    slack: false,
    notion: false,
    google_calendar: false,
  });
  const [persisted, setPersisted] = useState(false);
  const [loading, setLoading] = useState(true);

  const sync = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/integrations", { cache: "no-store" });
      const json = (await response.json()) as {
        integrations?: IntegrationPublicRecord[];
        oauthConfigured?: Capabilities;
        persisted?: boolean;
      };

      if (json.oauthConfigured) {
        setOauthConfigured(json.oauthConfigured);
      }

      if (json.persisted && json.integrations) {
        setPersisted(true);
        setIntegrations(json.integrations);
      } else {
        setPersisted(false);
        setIntegrations(readLocalIntegrations());
      }
    } catch {
      setPersisted(false);
      setIntegrations(readLocalIntegrations());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    void sync();
  }, [authLoading, user?.id, sync]);

  useEffect(() => {
    const onUpdate = () => {
      if (!persisted) {
        setIntegrations(readLocalIntegrations());
      }
    };
    window.addEventListener(INTEGRATIONS_UPDATED, onUpdate);
    return () => window.removeEventListener(INTEGRATIONS_UPDATED, onUpdate);
  }, [persisted]);

  const saveApiKey = useCallback(
    async (input: {
      provider: IntegrationProviderId;
      secret: IntegrationSecretPayload;
      label?: string;
    }) => {
      if (user) {
        const response = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: input.provider,
            authKind: "api_key" satisfies IntegrationAuthKind,
            secret: input.secret,
            label: input.label,
          }),
        });

        const json = (await response.json()) as {
          ok?: boolean;
          integration?: IntegrationPublicRecord;
          error?: string;
          code?: string;
        };

        if (!response.ok) {
          throw new Error(json.error ?? "Could not save integration.");
        }

        if (json.integration) {
          setIntegrations((prev) => [
            json.integration!,
            ...prev.filter((item) => item.provider !== input.provider),
          ]);
        }

        setPersisted(true);
        return json.integration;
      }

      const record = upsertLocalIntegration({
        provider: input.provider,
        authKind: "api_key",
        secret: input.secret,
        label: input.label,
      });
      setIntegrations((prev) => [
        record,
        ...prev.filter((item) => item.provider !== input.provider),
      ]);
      return record;
    },
    [user],
  );

  const disconnect = useCallback(
    async (provider: IntegrationProviderId) => {
      if (user) {
        const response = await fetch(`/api/integrations/${provider}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const json = (await response.json()) as { error?: string };
          throw new Error(json.error ?? "Could not disconnect.");
        }
      } else {
        removeLocalIntegration(provider);
      }

      setIntegrations((prev) => prev.filter((item) => item.provider !== provider));
    },
    [user],
  );

  const startOAuth = useCallback(
    (provider: IntegrationProviderId, nextPath = "/welcome") => {
      const url = `/api/integrations/oauth/${provider}/start?next=${encodeURIComponent(nextPath)}`;
      window.location.href = url;
    },
    [],
  );

  const isConnected = useCallback(
    (provider: IntegrationProviderId) =>
      integrations.some((item) => item.provider === provider && item.status === "connected"),
    [integrations],
  );

  return {
    integrations,
    oauthConfigured,
    persisted,
    loading,
    authLoading,
    user,
    sync,
    saveApiKey,
    disconnect,
    startOAuth,
    isConnected,
  };
}
