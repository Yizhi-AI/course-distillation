"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { withBasePath } from "@/lib/base-path";

export type PetStatus = "idle" | "processing" | "success";

type IdlePose = "idle" | "peek" | "smile" | "grooming";
type PetImage = IdlePose | "sleep" | "processing" | "success";

const petImages: Record<PetImage, string> = {
  idle: withBasePath("/pet/idle.webp"),
  peek: withBasePath("/pet/peek.webp"),
  smile: withBasePath("/pet/smile.webp"),
  grooming: withBasePath("/pet/grooming.webp"),
  sleep: withBasePath("/pet/sleep.webp"),
  processing: withBasePath("/pet/processing.webp"),
  success: withBasePath("/pet/success.webp"),
};

const idleActions: Array<{
  pose: Exclude<IdlePose, "idle">;
  duration: number;
}> = [
  { pose: "peek", duration: 2_000 },
  { pose: "smile", duration: 900 },
  { pose: "grooming", duration: 2_000 },
];

function randomIdleDelay() {
  return 8_000 + Math.floor(Math.random() * 10_001);
}

export function DesktopPet({ status }: { status: PetStatus }) {
  const [idlePose, setIdlePose] = useState<IdlePose>("idle");
  const [sleeping, setSleeping] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const inactivityTimer = useRef<number | null>(null);
  const idleActionTimer = useRef<number | null>(null);
  const idleResetTimer = useRef<number | null>(null);
  const lastIdleAction = useRef<Exclude<IdlePose, "idle"> | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(query.matches);
    syncPreference();
    query.addEventListener("change", syncPreference);
    return () => query.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    for (const source of Object.values(petImages)) {
      const image = new window.Image();
      image.src = source;
    }
  }, []);

  useEffect(() => {
    if (status !== "idle") return;

    const clearInactivityTimer = () => {
      if (inactivityTimer.current) {
        window.clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
    };

    const startInactivityTimer = () => {
      clearInactivityTimer();
      inactivityTimer.current = window.setTimeout(() => {
        setSleeping(true);
        setIdlePose("idle");
      }, 120_000);
    };

    const markActivity = () => {
      setSleeping(false);
      setIdlePose("idle");
      startInactivityTimer();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") markActivity();
    };

    startInactivityTimer();
    window.addEventListener("keydown", markActivity);
    window.addEventListener("scroll", markActivity, { passive: true });
    window.addEventListener("touchstart", markActivity, { passive: true });
    window.addEventListener("focus", markActivity);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInactivityTimer();
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("scroll", markActivity);
      window.removeEventListener("touchstart", markActivity);
      window.removeEventListener("focus", markActivity);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [status]);

  useEffect(() => {
    const clearIdleTimers = () => {
      if (idleActionTimer.current) {
        window.clearTimeout(idleActionTimer.current);
        idleActionTimer.current = null;
      }
      if (idleResetTimer.current) {
        window.clearTimeout(idleResetTimer.current);
        idleResetTimer.current = null;
      }
    };

    if (status !== "idle" || sleeping || reducedMotion) {
      clearIdleTimers();
      return clearIdleTimers;
    }

    const scheduleNextAction = () => {
      idleActionTimer.current = window.setTimeout(() => {
        const available = idleActions.filter(
          (action) => action.pose !== lastIdleAction.current,
        );
        const action =
          available[Math.floor(Math.random() * available.length)] ??
          idleActions[0];
        lastIdleAction.current = action.pose;
        setIdlePose(action.pose);
        idleResetTimer.current = window.setTimeout(() => {
          setIdlePose("idle");
          scheduleNextAction();
        }, action.duration);
      }, randomIdleDelay());
    };

    scheduleNextAction();
    return clearIdleTimers;
  }, [reducedMotion, sleeping, status]);

  const imageKey: PetImage =
    status === "processing"
      ? "processing"
      : status === "success"
        ? "success"
        : sleeping
          ? "sleep"
          : reducedMotion
            ? "idle"
            : idlePose;

  const imageSource = petImages[imageKey];

  return (
    <aside
      className={`desktop-pet is-${status}${sleeping ? " is-sleeping" : ""}`}
      aria-hidden="true"
    >
      <div className="desktop-pet-visual">
        {failedSource === imageSource ? (
          <span className="desktop-pet-fallback" />
        ) : (
          <Image
            src={imageSource}
            alt=""
            width="512"
            height="512"
            draggable={false}
            unoptimized
            onError={() => setFailedSource(imageSource)}
          />
        )}
        {status === "success" && <i className="desktop-pet-star">✦</i>}
      </div>
    </aside>
  );
}
