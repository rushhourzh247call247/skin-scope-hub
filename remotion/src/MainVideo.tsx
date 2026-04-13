import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill } from "remotion";

import { IntroScene } from "./scenes/IntroScene";
import { LoginScene } from "./scenes/LoginScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { NewPatientScene } from "./scenes/NewPatientScene";
import { PatientDetailScene } from "./scenes/PatientDetailScene";
import { BodyMapScene } from "./scenes/BodyMapScene";
import { QrUploadScene } from "./scenes/QrUploadScene";
import { SpotDetailScene } from "./scenes/SpotDetailScene";
import { ImageCompareScene } from "./scenes/ImageCompareScene";
import { ZonesScene } from "./scenes/ZonesScene";
import { PhotosScene } from "./scenes/PhotosScene";
import { ReportsScene } from "./scenes/ReportsScene";
import { PrivacyScene } from "./scenes/PrivacyScene";
import { PricingScene } from "./scenes/PricingScene";
import { RolesScene } from "./scenes/RolesScene";
import { LanguagesScene } from "./scenes/LanguagesScene";
import { SupportScene } from "./scenes/SupportScene";
import { OutroScene } from "./scenes/OutroScene";

const T = 15; // transition duration in frames

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0f1419" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <IntroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <LoginScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <DashboardScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <NewPatientScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <PatientDetailScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <BodyMapScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <QrUploadScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <SpotDetailScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <ImageCompareScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={90}>
          <ZonesScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={90}>
          <PhotosScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={90}>
          <ReportsScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={100}>
          <PrivacyScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={75}>
          <PricingScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={75}>
          <RolesScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={60}>
          <LanguagesScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={60}>
          <SupportScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={90}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
