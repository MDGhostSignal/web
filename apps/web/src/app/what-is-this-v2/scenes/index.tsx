"use client";

import type { ReactElement } from "react";

import type { ChapterDef, ChapterKind } from "../chapters";
import {
  CtaScene,
  PortalScene,
  PourScene,
  SelectScene,
  VortexScene,
} from "./interactiveScenes";
import {
  ApproachScene,
  CollectionScene,
  EntryScene,
  IntimateScene,
  MonumentScene,
  ProfileScene,
  ScaleScene,
  TransitionScene,
  WanderScene,
} from "./narrativeScenes";

type SceneProps = {
  chapter: ChapterDef;
  progress: number;
  isActive: boolean;
  runwayVh: number;
};

const SCENE_BY_KIND: Record<
  ChapterKind,
  (props: SceneProps) => ReactElement
> = {
  loader: EntryScene,
  wander: WanderScene,
  profile: ProfileScene,
  approach: ApproachScene,
  intimate: IntimateScene,
  portal: PortalScene,
  transition: TransitionScene,
  monument: MonumentScene,
  select: SelectScene,
  transform: PourScene,
  vortex: VortexScene,
  scale: ScaleScene,
  collection: CollectionScene,
  cta: CtaScene,
  footer: CtaScene,
};

export function renderChapterScene(props: SceneProps) {
  const Scene = SCENE_BY_KIND[props.chapter.kind] ?? EntryScene;
  return <Scene {...props} />;
}
