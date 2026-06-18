export {
  type PeopleGraph,
  type PersonExperienceRef,
  type PersonMeaningRef,
  type PersonNode,
  type PersonPlaceRef,
  type PersonSharedGlobeRef,
  type RelationshipScore,
} from "@/lib/people-graph/person-types";

export {
  personLabelFromNodeId,
  personNodeId,
} from "@/lib/people-graph/person-node-id";

export {
  eventIncludesPerson,
  personLabelsMatch,
} from "@/lib/people-graph/match-person-label";

export { collectEventPeople } from "@/lib/people-graph/collect-event-people";

export {
  scoreRelationship,
  type RelationshipScoreInput,
} from "@/lib/people-graph/score-relationship";

export {
  collectPersonMeanings,
  scorePersonMeaning,
} from "@/lib/people-graph/collect-person-meanings";

export { buildPeopleGraph } from "@/lib/people-graph/build-people-graph";

export {
  findPersonNode,
  topPeopleByMeaning,
  topPeopleByRelationship,
} from "@/lib/people-graph/rank-people-graph";
