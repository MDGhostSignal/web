"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";

import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

export default function GetInTouchPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      type: formData.get("type") as string,
      website: formData.get("website") as string,
      podcastOrProduct: formData.get("podcastOrProduct") as string,
      interest: formData.get("interest") as string,
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus("success");
        form.reset();
      } else {
        setSubmitStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Contact Section */}
      <section className={styles.contactSection}>
        <div className={styles.contactContent}>
          <div className={styles.contactText}>
            <ScrollFadeUp index={0} duration={1.6}>
              <p className={styles.contactEyebrow}>GET IN TOUCH</p>
            </ScrollFadeUp>
            <SplitLinesReveal duration={1.8} stagger={0.28}>
              <h1 className={styles.contactHeadline}>
                EVERY PARTNERSHIP STARTS WITH A CHAT
              </h1>
            </SplitLinesReveal>
            <ScrollFadeUp index={1} duration={1.6}>
              <p className={styles.contactBody}>
                Podcaster or Advertiser, ready to find your frequency? Schedule a call.
              </p>
            </ScrollFadeUp>
          </div>
          <div className={styles.contactVisual}>
            <Image
              src="/images/home/figma/bars.png"
              alt="Colorful horizontal lines representing the signal"
              width={400}
              height={300}
              className={styles.contactBars}
            />
            <Image
              src="/images/for-creators/jeremycontact.jpg"
              alt="Jeremy"
              width={350}
              height={350}
              className={styles.contactPhoto}
            />
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className={styles.formSection}>
        <div className={styles.formContainer}>
          <ScrollFadeUp index={0} duration={1.6}>
            {submitStatus === "success" ? (
              <div className={styles.successMessage}>
                <div className={styles.successIcon}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="24" fill="#22c55e" fillOpacity="0.1" />
                    <path
                      d="M16 24L22 30L32 18"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className={styles.successTitle}>Message Sent!</h2>
                <p className={styles.successText}>
                  Thank you for reaching out. We&apos;ll get back to you shortly.
                </p>
                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={() => setSubmitStatus("idle")}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className={styles.contactForm} onSubmit={handleSubmit}>
                {submitStatus === "error" && (
                  <div className={styles.errorMessage}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="10" fill="#ef4444" fillOpacity="0.1" />
                      <path d="M10 6V10M10 14H10.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="firstName" className={styles.formLabel}>First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      className={styles.formInput}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="lastName" className={styles.formLabel}>Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      className={styles.formInput}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.formLabel}>Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className={styles.formInput}
                    disabled={isSubmitting}
                  />
                </div>

                <fieldset className={styles.formGroup}>
                  <legend className={styles.formLabel}>Podcast or Advertiser?</legend>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="type"
                        value="podcast"
                        className={styles.radioInput}
                        disabled={isSubmitting}
                      />
                      <span className={styles.radioText}>Podcast</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="type"
                        value="advertiser"
                        className={styles.radioInput}
                        disabled={isSubmitting}
                      />
                      <span className={styles.radioText}>Advertiser</span>
                    </label>
                  </div>
                </fieldset>

                <div className={styles.formGroup}>
                  <label htmlFor="website" className={styles.formLabel}>Your Website</label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    placeholder="https://"
                    className={styles.formInput}
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="podcastOrProduct" className={styles.formLabel}>What is your podcast or product?</label>
                  <textarea
                    id="podcastOrProduct"
                    name="podcastOrProduct"
                    rows={3}
                    className={styles.formTextarea}
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="interest" className={styles.formLabel}>What has you interested in GHOSTSignal?</label>
                  <textarea
                    id="interest"
                    name="interest"
                    rows={4}
                    className={styles.formTextarea}
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Submit"}
                </button>
              </form>
            )}
          </ScrollFadeUp>
        </div>
      </section>

      <Footer />
    </main>
  );
}
