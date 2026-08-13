import { describe, expect, it } from "vitest";
import {
  mapGoogleEventToDiscord,
  parseServiceAccountJson,
} from "../src/modules/calendar/services/calendarMapper.js";
import {
  formatEmailAnnouncement,
  normalizeMessageId,
  shouldIgnoreListEmail,
  stripHtml,
  truncateEmailBody,
} from "../src/modules/email/services/emailParser.js";
import {
  buildSocialAnnouncement,
  mapInstagramMedia,
  mapLinkedInPost,
  truncateCaption,
} from "../src/modules/social/services/socialPosts.js";

describe("email list parsing", () => {
  it("normalizes message ids and strips html", () => {
    expect(normalizeMessageId("<abc@esw.org>")).toBe("abc@esw.org");
    expect(stripHtml("<p>Hello<br/>world</p>")).toContain("Hello");
    expect(truncateEmailBody("x".repeat(50), 20).endsWith("…")).toBe(true);
  });

  it("ignores replies, bounces, and autoresponders", () => {
    expect(
      shouldIgnoreListEmail({
        subject: "Re: Meeting notes",
        fromAddress: "member@school.edu",
      }),
    ).toBe(true);
    expect(
      shouldIgnoreListEmail({
        subject: "Weekly update",
        fromAddress: "MAILER-DAEMON@google.com",
      }),
    ).toBe(true);
    expect(
      shouldIgnoreListEmail({
        subject: "Weekly update",
        fromAddress: "hq@esw.org",
        autoSubmitted: "auto-generated",
      }),
    ).toBe(true);
    expect(
      shouldIgnoreListEmail({
        subject: "Weekly update",
        fromAddress: "hq@esw.org",
      }),
    ).toBe(false);
  });

  it("formats a Discord announcement without overflowing", () => {
    const message = formatEmailAnnouncement({
      messageId: "1",
      subject: "Build Day recap",
      fromAddress: "hq@esw.org",
      text: "We had a great turnout.",
      receivedAt: null,
    });
    expect(message).toContain("Build Day recap");
    expect(message.length).toBeLessThanOrEqual(1900);
  });
});

describe("calendar mapping", () => {
  it("maps timed Google events to Discord external events", () => {
    const mapped = mapGoogleEventToDiscord({
      id: "evt-1",
      etag: "etag-1",
      summary: "ESW All-Hands",
      description: "Monthly chapter call",
      hangoutLink: "https://meet.google.com/abc-defg-hij",
      start: { dateTime: "2026-09-01T20:00:00-04:00" },
      end: { dateTime: "2026-09-01T21:00:00-04:00" },
    });

    expect(mapped?.name).toBe("ESW All-Hands");
    expect(mapped?.location).toContain("meet.google.com");
    expect(mapped?.cancelled).toBe(false);
    expect(mapped?.end.getTime()).toBeGreaterThan(mapped!.start.getTime());
  });

  it("marks cancelled events and rejects invalid service account json", () => {
    expect(mapGoogleEventToDiscord({ id: "evt-2", status: "cancelled" })?.cancelled).toBe(
      true,
    );
    expect(parseServiceAccountJson("{not-json")).toBeNull();
    expect(
      parseServiceAccountJson(
        JSON.stringify({ client_email: "bot@esw.iam.gserviceaccount.com", private_key: "key" }),
      )?.client_email,
    ).toBe("bot@esw.iam.gserviceaccount.com");
  });
});

describe("social post mapping", () => {
  it("maps Instagram media into a Discord embed payload", () => {
    const post = mapInstagramMedia({
      id: "ig-1",
      caption: "Hydroponics update from chapter",
      permalink: "https://www.instagram.com/p/abc/",
      media_url: "https://example.com/photo.jpg",
      timestamp: "2026-08-01T12:00:00+0000",
    });

    expect(post?.platform).toBe("instagram");
    const announcement = buildSocialAnnouncement(post!);
    expect(announcement.content).toBe(post!.permalink);
    const embed = announcement.embeds?.[0];
    expect(embed && "toJSON" in embed ? embed.toJSON().title : undefined).toBe(
      "New Instagram post",
    );
  });

  it("maps LinkedIn posts and truncates long captions", () => {
    const post = mapLinkedInPost({
      id: "urn:li:share:123",
      commentary: "Join us for Build Day!",
    });
    expect(post?.platform).toBe("linkedin");
    expect(post?.permalink).toContain("linkedin.com");
    expect(truncateCaption("a".repeat(50), 20).endsWith("…")).toBe(true);
  });
});
