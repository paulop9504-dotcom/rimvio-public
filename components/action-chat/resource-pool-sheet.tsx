"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  Download,
  FolderGit2,
  Image,
  Link2,
  Plus,
  Search,
  Star,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useResourcePool } from "@/hooks/use-resource-pool";
import {
  countResourcePoolItems,
} from "@/lib/resource-pool/resource-pool-store";
import type { ResourcePoolItem, ResourcePoolItemKind } from "@/lib/resource-pool/resource-pool-types";
import type { LinkRow } from "@/types/database";
import { isGoogleSheetsUrl } from "@/lib/integrations/google-sheets-embed";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ResourcePoolSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links?: LinkRow[];
  onOpenLink?: (linkId: string) => void;
  onOpenGoogleSheet?: (url: string, title?: string) => void;
  onOpenCapture?: () => void;
};

const KIND_META: Record<
  ResourcePoolItemKind,
  { label: string; icon: typeof StickyNote; tone: string }
> = {
  memo: { label: "메모", icon: StickyNote, tone: "#30D158" },
  link: { label: "링크", icon: Link2, tone: "#32D7FF" },
  photo: { label: "사진", icon: Image, tone: "#BF5AF2" },
  misc: { label: "기타", icon: Archive, tone: "#9CA3AF" },
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return "방금";
  }
  if (minutes < 60) {
    return `${minutes}분 전`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}시간 전`;
  }
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function ItemRow({
  item,
  repos,
  onToggleStar,
  onDelete,
  onMove,
  onOpen,
}: {
  item: ResourcePoolItem;
  repos: Array<{ id: string; name: string }>;
  onToggleStar: (itemId: string, starred: boolean) => void;
  onDelete: (itemId: string) => void;
  onMove: (itemId: string, repoId: string) => void;
  onOpen: (item: ResourcePoolItem) => void;
}) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;

  return (
    <div className="group rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.05]">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          aria-label={item.starred ? "즐겨찾기 해제" : "즐겨찾기"}
          onClick={() => onToggleStar(item.id, !item.starred)}
          className="mt-0.5 shrink-0 text-white/35 transition hover:text-rimvio-neon-amber"
        >
          <Star
            className={cn("size-4", item.starred && "fill-rimvio-neon-amber text-rimvio-neon-amber")}
          />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(item)}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: `${meta.tone}22`, color: meta.tone }}
            >
              <Icon className="size-3" />
              {meta.label}
            </span>
            <span className="truncate text-[13px] font-semibold text-[#F3F4F6]">
              {item.title}
            </span>
            {item.url && isGoogleSheetsUrl(item.url) ? (
              <span className="shrink-0 rounded-md bg-[#30D158]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#86EFAC]">
                시트
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#9CA3AF]">
            {item.body || item.url}
          </p>
          <p className="mt-1 text-[10px] text-[#6B7280]">{formatRelativeTime(item.updatedAt)}</p>
        </button>
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="size-10 shrink-0 rounded-lg object-cover"
          />
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <select
          aria-label="저장소 이동"
          value={item.repoId}
          onChange={(event) => onMove(item.id, event.target.value)}
          className="rounded-lg border border-white/10 bg-[#111827] px-2 py-1 text-[10px] text-[#E5E7EB]"
        >
          {repos.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-[#FCA5A5]/30 px-2 py-1 text-[10px] font-semibold text-[#FCA5A5]"
        >
          <Trash2 className="size-3" />
          삭제
        </button>
      </div>
    </div>
  );
}

export function ResourcePoolSheet({
  open,
  onOpenChange,
  links = [],
  onOpenLink,
  onOpenGoogleSheet,
  onOpenCapture,
}: ResourcePoolSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [activeRepoId, setActiveRepoId] = useState<string>("inbox");
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerKind, setComposerKind] = useState<ResourcePoolItemKind>("memo");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [newRepoName, setNewRepoName] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const { repos, items, totalCount, inboxCount, addItem, createRepo, toggleStar, moveItem, removeItem, removeRepo, exportSnapshot, importSnapshot, syncLinks } =
    useResourcePool({ repoId: activeRepoId, query });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    syncLinks(links);
  }, [open, links, syncLinks]);

  const repoCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const repo of repos) {
      map[repo.id] = countResourcePoolItems(repo.id);
    }
    return map;
  }, [repos, items, totalCount]);

  const handleOpenItem = (item: ResourcePoolItem) => {
    const itemUrl = item.url?.trim();
    if (itemUrl && isGoogleSheetsUrl(itemUrl)) {
      onOpenGoogleSheet?.(itemUrl, item.title);
      return;
    }
    if (item.sourceLinkId && onOpenLink) {
      onOpenLink(item.sourceLinkId);
      onOpenChange(false);
      return;
    }
    if (item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.body) {
      void navigator.clipboard.writeText(item.body);
      toast("내용을 복사했어요");
    }
  };

  const handleAddItem = () => {
    const title = composerTitle.trim() || composerBody.trim();
    if (!title) {
      toast("제목이나 내용을 입력해 주세요");
      return;
    }
    addItem({
      repoId: activeRepoId,
      kind: composerKind,
      title,
      body: composerBody.trim() || title,
      url: composerKind === "link" ? composerBody.trim() || composerTitle.trim() : undefined,
    });
    const savedUrl = composerKind === "link" ? composerBody.trim() || composerTitle.trim() : "";
    setComposerTitle("");
    setComposerBody("");
    setComposerOpen(false);
    toast("리소스풀에 저장했어요");
    if (savedUrl && isGoogleSheetsUrl(savedUrl)) {
      onOpenGoogleSheet?.(savedUrl, title);
    }
  };

  const handleCreateRepo = () => {
    const name = newRepoName.trim();
    if (!name) {
      return;
    }
    const repo = createRepo({ name });
    setNewRepoName("");
    setActiveRepoId(repo.id);
    toast(`저장소 ${repo.name} 생성`);
  };

  const handleExport = () => {
    const blob = new Blob([exportSnapshot()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rimvio-resource-pool-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("백업 파일을 내려받았어요");
  };

  const handleImportFile = async (file: File) => {
    try {
      const raw = await file.text();
      importSnapshot(raw, "merge");
      toast("백업을 불러왔어요");
    } catch (error) {
      toast(error instanceof Error ? error.message : "백업 불러오기 실패");
    }
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[80] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label="리소스풀"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[min(88vh,760px)] max-w-lg flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-[#1F2937] shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 pb-3 pt-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#BF5AF2]/20 text-[#D8B4FE]">
                  <FolderGit2 className="size-4" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#F3F4F6]">리소스풀</p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    GitHub처럼 저장소 · {totalCount}개 · inbox {inboxCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="백업 내보내기"
                  onClick={handleExport}
                  className="flex size-8 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-white/5"
                >
                  <Download className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="백업 가져오기"
                  onClick={() => importRef.current?.click()}
                  className="flex size-8 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-white/5"
                >
                  <Upload className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-8 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-white/5"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImportFile(file);
                }
                event.target.value = "";
              }}
            />

            <div className="border-b border-white/[0.06] px-4 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="메모 · 링크 · 사진 검색"
                  className="w-full rounded-xl border border-white/10 bg-[#111827] py-2 pl-9 pr-3 text-[13px] text-[#F3F4F6] placeholder:text-[#6B7280] focus:border-[#BF5AF2]/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {repos.map((repo) => (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => setActiveRepoId(repo.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                    activeRepoId === repo.id
                      ? "border-[#BF5AF2]/50 bg-[#BF5AF2]/15 text-[#E9D5FF]"
                      : "border-white/10 bg-white/[0.03] text-[#9CA3AF] hover:text-[#E5E7EB]",
                  )}
                >
                  <span style={{ color: activeRepoId === repo.id ? repo.color : undefined }}>
                    {repo.name}
                  </span>
                  <span className="ml-1 tabular-nums text-[10px] opacity-70">
                    {repoCounts[repo.id] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain px-4 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                    <p className="text-[13px] font-medium text-[#D1D5DB]">비어 있어요</p>
                    <p className="mt-1 text-[11px] text-[#6B7280]">
                      @메모 · 링크 · 캡처가 여기에 쌓여요
                    </p>
                  </div>
                ) : (
                  items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      repos={repos}
                      onToggleStar={toggleStar}
                      onDelete={removeItem}
                      onMove={moveItem}
                      onOpen={handleOpenItem}
                    />
                  ))
                )}

                {!repos.find((repo) => repo.id === activeRepoId)?.system ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (removeRepo(activeRepoId)) {
                        setActiveRepoId("inbox");
                        toast("저장소를 삭제했어요");
                      }
                    }}
                    className="pb-2 text-[10px] font-semibold text-[#FCA5A5]"
                  >
                    이 저장소 삭제
                  </button>
                ) : null}
              </div>

              <div className="shrink-0 border-t border-white/[0.08] bg-[#1F2937] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {composerOpen ? (
                  <div className="mb-3 rounded-xl border border-[#BF5AF2]/35 bg-[#111827] p-3 shadow-[0_-4px_24px_rgba(0,0,0,0.25)]">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-[#E9D5FF]">
                        {KIND_META[composerKind].label} 추가 · {activeRepoId}
                      </p>
                      <button
                        type="button"
                        onClick={() => setComposerOpen(false)}
                        className="flex size-7 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-white/5"
                        aria-label="입력 닫기"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <input
                      value={composerTitle}
                      onChange={(event) => setComposerTitle(event.target.value)}
                      placeholder="제목"
                      className="mb-2 w-full rounded-lg border border-white/10 bg-[#1F2937] px-3 py-2 text-[13px] text-[#F3F4F6] focus:border-[#BF5AF2]/40 focus:outline-none"
                    />
                    <textarea
                      value={composerBody}
                      onChange={(event) => setComposerBody(event.target.value)}
                      placeholder={composerKind === "link" ? "https://..." : "내용"}
                      rows={2}
                      className="mb-2 w-full resize-none rounded-lg border border-white/10 bg-[#1F2937] px-3 py-2 text-[13px] text-[#F3F4F6] focus:border-[#BF5AF2]/40 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setComposerOpen(false)}
                        className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[#9CA3AF]"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="rounded-lg bg-rimvio-neon-green px-3 py-1.5 text-[11px] font-semibold text-black"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (composerOpen && composerKind === "memo") {
                        setComposerOpen(false);
                        return;
                      }
                      setComposerKind("memo");
                      setComposerOpen(true);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition",
                      composerOpen && composerKind === "memo"
                        ? "border-[#30D158]/50 bg-[#30D158]/12 text-[#86EFAC]"
                        : "border-white/10 text-[#E5E7EB] hover:bg-white/5",
                    )}
                  >
                    <Plus className="size-3.5" />
                    메모
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (composerOpen && composerKind === "link") {
                        setComposerOpen(false);
                        return;
                      }
                      setComposerKind("link");
                      setComposerOpen(true);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition",
                      composerOpen && composerKind === "link"
                        ? "border-[#32D7FF]/50 bg-[#32D7FF]/12 text-[#7DD3FC]"
                        : "border-white/10 text-[#E5E7EB] hover:bg-white/5",
                    )}
                  >
                    <Plus className="size-3.5" />
                    링크
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCapture?.();
                      onOpenChange(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-2 text-[11px] font-semibold text-[#E5E7EB] hover:bg-white/5"
                  >
                    <Image className="size-3.5" />
                    사진
                  </button>
                  <div className="ml-auto flex min-w-0 items-center gap-1">
                    <input
                      value={newRepoName}
                      onChange={(event) => setNewRepoName(event.target.value)}
                      placeholder="새 저장소"
                      className="w-[5.5rem] min-w-0 rounded-lg border border-white/10 bg-[#111827] px-2 py-2 text-[11px] text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateRepo}
                      className="shrink-0 rounded-lg border border-[#BF5AF2]/35 bg-[#BF5AF2]/20 px-2.5 py-2 text-[11px] font-semibold text-[#E9D5FF] transition hover:bg-[#BF5AF2]/30"
                    >
                      Repo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
