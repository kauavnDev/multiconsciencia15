"use client";

import type { CSSProperties } from "react";
import { getAgentIdentity } from "@/lib/agents/identity";

export default function AgentRobot({ slug, size = "normal" }: { slug: string; size?: "small" | "normal" | "large" }) {
  const identity = getAgentIdentity(slug);
  if (!identity) return <span className={`robot-fallback robot-size-${size}`}>AI</span>;
  const style = { "--robot-color": identity.color, "--robot-accent": identity.accent } as CSSProperties;
  return <span className={`robot-portrait robot-${identity.visual} robot-size-${size}`} style={style} role="img" aria-label={`Robô ${identity.codename}`}>
    <i className="robot-aerial"/><i className="robot-head"><b/><b/><em/></i><i className="robot-neck"/><i className="robot-body"><b/><b/></i><i className="robot-side-detail"/>
  </span>;
}
