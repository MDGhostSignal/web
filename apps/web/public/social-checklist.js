const PILLARS = {
  inspirational: { label: "Inspirational", color: "var(--terracotta)" },
  educational:   { label: "Educational",   color: "var(--wine)" },
  snowdrift:     { label: "Snow Drift",     color: "var(--green)" },
  community:     { label: "Community",      color: "var(--signal)" },
};

const POSTS = [
  {
    id: "p1", pillar: "inspirational", title: "The roster is real",
    platforms: [
      { name: "Instagram", text:
`Static, meet signal. 📡

These are the brands and creators already tuned in — The Rabbit Room, The Habit, Hutchmoot, The Biblical Mind, Tonja's Toffee, Sunshine In My Nest, and more. Not a media buy. A community that shares a why.

See the whole roster — link in bio.
#GHOSTSignal #ValuesBasedAdvertising #Podcasting #WorldMaking` },
      { name: "Facebook", text:
`We used to talk about values-based advertising as an idea. Now it has faces.

The GHOSTSignal roster is live — real brands and real creators (The Rabbit Room, The Habit, Hutchmoot, The Biblical Mind, Tonja's Toffee, and more) who'd rather build something that resonates than something that just reaches.

Meet them all 👉 ghostsignal.cloud/invitation` },
      { name: "LinkedIn", text:
`When we started GHOSTSignal, "values-based advertising" was a thesis. Today it's a roster.

The brands and creators now on the network — The Rabbit Room, The Habit, Hutchmoot, The Biblical Mind, Tonja's Toffee, Sunshine In My Nest, and others — share more than a demographic. They share a mission. That's the whole bet: put first things first, and the second things (reach, revenue, trust) follow.

See who's tuned in: [link]
#GHOSTSignal #ValuesBasedAdvertising #Podcasting` },
      { name: "X", text:
`Static, meet signal. 📡

The GHOSTSignal roster is live — real brands + creators who share a why, not just an audience size. The Rabbit Room, The Habit, Hutchmoot & more.

Meet them [link]
#GHOSTSignal #ValuesBasedAdvertising` },
    ],
  },
  {
    id: "p2", pillar: "educational", title: "What's your XQ?",
    platforms: [
      { name: "Instagram", text:
`Think Myers-Briggs, but for how your brand shows up in the world. 🔍

Your XQ is your archetype — the shape of your signal before we ever talk numbers. It's free, it takes a few minutes, and it's the first step to matches that actually fit.

Find your XQ — link in bio.
#GHOSTSignal #XQ #ValuesBasedAdvertising #BrandStrategy` },
      { name: "Facebook", text:
`What's your XQ?

It's our free archetype quiz — a quick way to map the shape of your brand's signal (a bit like Myers-Briggs, but for resonance). No cost, no pitch. Just a clearer picture of who you align with.

Take it here 👉 [link]` },
      { name: "LinkedIn", text:
`Most ad matching starts with reach. We start with fit.

XQ is our free archetype assessment — before any numbers, it maps how a brand or creator shows up: the values, tone, and posture that make a partnership feel natural instead of transactional. Think of it as the personality layer beneath the media plan.

Curious what yours is? [link]
#GHOSTSignal #XQ #BrandStrategy #Podcasting` },
      { name: "X", text:
`Myers-Briggs, but for your brand's signal. 🔍

XQ is our free archetype quiz — the shape of your resonance before we ever talk numbers. Takes a few minutes.

What's your XQ? [link]
#GHOSTSignal #XQ` },
    ],
  },
  {
    id: "p3", pillar: "snowdrift", title: "Subscribe to Snow Drift",
    platforms: [
      { name: "Instagram", text:
`❄️ Snow Drift is where we slow down.

Our newsletter on soulful, values-based advertising — the ideas underneath the network. Why the ad break can be mission fuel. Why resonance beats reach. Why first things, first.

Subscribe — link in bio.
#SnowDrift #GHOSTSignal #ValuesBasedAdvertising` },
      { name: "Facebook", text:
`Some ideas need more than a caption. That's what Snow Drift is for.

It's our newsletter — deeper dives into values-based advertising, world-making, and the case that quality and care are worth investing in. Quiet, unhurried, and free.

Subscribe 👉 [link]` },
      { name: "LinkedIn", text:
`We write a newsletter called Snow Drift. It's not a product update — it's the thinking underneath the product.

Each issue works through one idea: why the transactional ad model erodes trust, why a members-only ecosystem changes the incentives, why "mission fuel" is a better frame for sponsorship than "ad break." If you care about where advertising is headed, it's worth the read.

Subscribe here [link]
#SnowDrift #GHOSTSignal #ValuesBasedAdvertising` },
      { name: "X", text:
`❄️ Snow Drift — our newsletter on values-based advertising.

Resonance over reach. Mission fuel over ad breaks. First things, first.

Subscribe [link]
#SnowDrift #GHOSTSignal` },
    ],
  },
  {
    id: "p4", pillar: "community", title: "Ask the audience",
    platforms: [
      { name: "Instagram", text:
`Real talk 👇

What's a brand-and-creator partnership that actually fit — one where the ad didn't feel like an interruption, but like part of the show?

Tell us in the comments. We might feature it.
#GHOSTSignal #ValuesBasedAdvertising #Podcasting` },
      { name: "Facebook", text:
`A question for creators and listeners alike:

When has a sponsorship actually fit the show — where the brand felt like it belonged there? Drop the example below. The best ones are proof that resonance beats reach, and we'd love to celebrate them. 👇` },
      { name: "LinkedIn", text:
`A question for the marketers and creators here:

Think of a sponsorship that genuinely fit — where the brand felt native to the show, not bolted on. What made it work? Shared audience? Shared values? The host actually using the product?

I'd love to hear examples in the comments — we're mapping what "good fit" really looks like.
#GHOSTSignal #Podcasting #ValuesBasedAdvertising` },
      { name: "X", text:
`Question 👇

Name a podcast sponsorship that actually fit — where the ad felt like part of the show, not an interruption.

What made it work?
#GHOSTSignal #Podcasting` },
    ],
  },
  {
    id: "p5", pillar: "educational", title: "The Resonance Index (RQ)",
    platforms: [
      { name: "Instagram", text:
`How do we know a match will actually work? The Resonance Index. 🎯

1️⃣ Mission convergence — does this fit both missions?
2️⃣ Content safety — is it right for the audience?
3️⃣ Tone & aesthetic fit — will the endorsement feel true?

Fit you can feel, before a dollar is spent.
#GHOSTSignal #ResonanceIndex #ValuesBasedAdvertising` },
      { name: "Facebook", text:
`"Will this partnership actually work?" We don't guess. We use the Resonance Index.

It scores a potential match on the things that make an endorsement feel true: mission convergence, content safety, partner overlap, and tone-and-aesthetic fit. The result is de-risked spend for brands and genuine fit for creators — resonance over reach, by design.

Learn how it works 👉 [link]` },
      { name: "LinkedIn", text:
`Brand safety usually means a blocklist. We think it should mean fit.

The GHOSTSignal Resonance Index evaluates a potential partnership on four things: mission convergence, content safety, partner overlap, and tone-and-aesthetic fit. For brands, that's de-risked spend and higher-conviction endorsements. For creators, it's the confidence that a sponsor belongs on the show. Same three pillars as our membership standard — applied to the specific match.

More on the framework [link]
#GHOSTSignal #ResonanceIndex #BrandSafety #Podcasting` },
      { name: "X", text:
`How we know a match will work — the Resonance Index 🎯

• Mission convergence
• Content safety
• Tone & aesthetic fit

Fit you can feel, before a dollar is spent.
#GHOSTSignal #ValuesBasedAdvertising` },
    ],
  },
  {
    id: "p6", pillar: "inspirational", title: "Ad break → mission fuel",
    platforms: [
      { name: "Instagram", text:
`For creators: the ad break doesn't have to be the part you apologize for. ✨

When a brand that shares your values invests in your show, the read stops being a necessary evil and becomes mission fuel — an affirmation of the work, from the ecosystem, back into your signal.

That's the whole idea.
#GHOSTSignal #Podcasting #CreatorEconomy #ValuesBasedAdvertising` },
      { name: "Facebook", text:
`Every independent creator knows the ad-break wince. We think it can be something else.

When the brand shares your values, the sponsorship isn't an interruption — it's an investment from the ecosystem into your work. Better support → better content → a more aligned audience → more aligned partners. A virtuous cycle instead of a transaction.

That's what we're building at GHOSTSignal.` },
      { name: "LinkedIn", text:
`Reframing one line for independent creators:

An ad break is not a necessary evil. When a value-aligned brand invests in your show, the revenue isn't just a payment — it's a tangible affirmation of the work, and fuel for more of it. Support → better content → aligned audience → aligned partners. That virtuous cycle is the engine of sustainable independent media.

It's why we measure success in years of audience loyalty, not quarterly impressions.
#GHOSTSignal #CreatorEconomy #Podcasting #ValuesBasedAdvertising` },
      { name: "X", text:
`Creators: the ad break doesn't have to be the part you apologize for.

When the brand shares your values, the read becomes mission fuel — an investment from the ecosystem back into your signal.

That's the whole idea.
#GHOSTSignal #CreatorEconomy` },
    ],
  },
  {
    id: "p7", pillar: "community", title: "Brands, you're invited",
    platforms: [
      { name: "Instagram", text:
`You're invited. 💌

If your brand would rather resonate than just reach — if you'd rather belong to a community than rent an audience — there's a seat for you on the GHOSTSignal network.

See who's already here, and step in — link in bio.
#GHOSTSignal #ValuesBasedAdvertising #PodcastAdvertising` },
      { name: "Facebook", text:
`An open invitation to brands 💌

GHOSTSignal isn't an ad marketplace — it's a members' community of brands and creators who share a why. If that sounds like you, come see who's already on the roster and find your place in it.

You're invited 👉 ghostsignal.cloud/invitation` },
      { name: "LinkedIn", text:
`An open invitation to brand and marketing leaders:

If you're tired of renting attention and ready to belong to a community that shares your values, GHOSTSignal is building exactly that — a members' network of brands and creators matched on resonance, not just reach. Our roster is live; there's room for the right brands.

See who's here, and step in [link]
#GHOSTSignal #ValuesBasedAdvertising #PodcastAdvertising #B2BMarketing` },
      { name: "X", text:
`Brands: you're invited. 💌

Rather resonate than just reach? There's a seat for you on the GHOSTSignal network. See who's already tuned in.

[link]
#GHOSTSignal #ValuesBasedAdvertising` },
    ],
  },
];

const STORE_KEY = "gs-social-checklist-2026-08-19";
let checked = {};
try { checked = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { checked = {}; }
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(checked)); } catch (e) {} }

const listEl = document.getElementById("list");
let TOTAL = 0;

function makeTextEl(text) {
  const p = document.createElement("p");
  p.className = "text";
  text.split("\n").forEach(function (ln, i, arr) {
    const span = document.createElement("span");
    if (ln.trim().startsWith("#")) span.className = "tags";
    span.textContent = ln;
    p.append(span);
    if (i < arr.length - 1) p.append(document.createTextNode("\n"));
  });
  return p;
}

POSTS.forEach(function (post) {
  const pillar = PILLARS[post.pillar];
  const card = document.createElement("section");
  card.className = "card";
  card.style.setProperty("--accent", pillar.color);

  const head = document.createElement("div");
  head.className = "card-head";
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = pillar.label;
  const title = document.createElement("h2");
  title.className = "card-title";
  title.textContent = post.title;
  const count = document.createElement("span");
  count.className = "card-count";
  count.id = "count-" + post.id;
  head.append(chip, title, count);

  const morse = document.createElement("div");
  morse.className = "morse";

  const rows = document.createElement("div");
  rows.className = "rows";

  post.platforms.forEach(function (pf) {
    TOTAL++;
    const key = post.id + ":" + pf.name;
    const row = document.createElement("label");
    row.className = "row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!checked[key];
    if (cb.checked) row.classList.add("done");

    const body = document.createElement("div");
    body.className = "body";
    const plat = document.createElement("div");
    plat.className = "platform";
    const dot = document.createElement("span");
    dot.className = "dot";
    plat.append(dot, document.createTextNode(pf.name));
    body.append(plat, makeTextEl(pf.text));

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy";
    copy.textContent = "Copy";
    copy.addEventListener("click", function (e) {
      e.preventDefault();
      navigator.clipboard.writeText(pf.text).then(function () {
        copy.textContent = "Copied ✓";
        copy.classList.add("copied");
        setTimeout(function () { copy.textContent = "Copy"; copy.classList.remove("copied"); }, 1400);
      });
    });

    cb.addEventListener("change", function () {
      checked[key] = cb.checked;
      row.classList.toggle("done", cb.checked);
      save();
      refresh();
    });

    row.append(cb, body, copy);
    rows.append(row);
  });

  card.append(head, morse, rows);
  listEl.append(card);
});

document.getElementById("totalCount").textContent = TOTAL;

function refresh() {
  let done = 0;
  POSTS.forEach(function (post) {
    let cardDone = 0;
    post.platforms.forEach(function (pf) {
      if (checked[post.id + ":" + pf.name]) { done++; cardDone++; }
    });
    document.getElementById("count-" + post.id).textContent = cardDone + " / " + post.platforms.length;
  });
  document.getElementById("doneCount").textContent = done;
  document.getElementById("meterFill").style.width = (TOTAL ? (done / TOTAL * 100) : 0) + "%";
}

document.getElementById("resetBtn").addEventListener("click", function () {
  checked = {};
  save();
  document.querySelectorAll('.row input[type="checkbox"]').forEach(function (cb) {
    cb.checked = false;
    cb.closest(".row").classList.remove("done");
  });
  refresh();
});

let hideDone = false;
const collapseBtn = document.getElementById("collapseDone");
collapseBtn.addEventListener("click", function () {
  hideDone = !hideDone;
  collapseBtn.textContent = hideDone ? "Show completed" : "Hide completed";
  document.querySelectorAll(".row").forEach(function (row) {
    if (row.classList.contains("done")) row.style.display = hideDone ? "none" : "";
  });
});

refresh();
