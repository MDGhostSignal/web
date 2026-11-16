import { Section, Container } from "@/components/layout";
import { XQ_LANDING } from "@/lib/xq/site";

import { XqFrame } from "@/app/experimental/xq/XqFrame";
import xq from "@/app/experimental/xq/xq.module.css";

import { NotifyForm } from "./NotifyForm";
import { PairingIcons } from "./PairingIcons";
import { PreviewMap } from "./PreviewMap";
import styles from "./page.module.css";

export default function XqPreviewPage() {
  return (
    <XqFrame>
      <Section className={xq.landHero}>
        <Container className={xq.bandCopy}>
          <p className={xq.kicker}>GHOSTSignal · XQ</p>
          <h1 className={xq.h1}>{XQ_LANDING.headline}</h1>
          <p className={xq.lede}>
            One analysis, in two parts. Part One names the values your company already
            holds. Part Two shows the kind of partner you are.
          </p>
          <p className={xq.body}>
            The consolidated XQ is almost ready. Explore the eight characters below, then
            leave your email to hear when it opens.
          </p>
        </Container>
      </Section>

      <Section className={xq.landBand}>
        <Container className={styles.pairingRow}>
          <div className={`${xq.bandCopy} ${styles.pairingCopy}`}>
            <p className={xq.kicker}>Creators and brands</p>
            <h2 className={xq.h2}>The world is made in the pairing</h2>
            <p className={xq.body}>
              A brand and a creator can share an audience and still miss each other entirely.
            </p>
            <p className={xq.body}>
              The XQ is the moment before the handshake, when it becomes clear they were
              already keeping the same fire. What one protects, the other knows how to carry.
              What one is ready to change, the other has already begun. The quiz does not
              arrange the meeting. It names the two already making one world.
            </p>
          </div>
          <PairingIcons />
        </Container>
      </Section>

      <Section className={xq.landBand}>
        <Container className={xq.typeBlock}>
          <div className={xq.bandCopy}>
            <p className={xq.kicker}>The eight characters</p>
            <h2 className={xq.h2}>Where they sit</h2>
            <p className={xq.body}>
              Hover a symbol to read who that character belongs with.
            </p>
          </div>
          <PreviewMap />
        </Container>
      </Section>

      <Section className={xq.landClose}>
        <Container className={styles.notifyBlock}>
          <div className={xq.bandCopy}>
            <p className={xq.kicker}>Coming soon</p>
            <h2 className={xq.h2}>Get notified</h2>
            <p className={xq.body}>
              Leave your email and we will tell you when XQ Part One and Part Two go live.
            </p>
          </div>
          <NotifyForm />
        </Container>
      </Section>
    </XqFrame>
  );
}
