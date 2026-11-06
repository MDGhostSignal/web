/**
 * Locked page copy from docs/XQ_ARCHETYPE_COPY.md.
 * Individual pages use H1, H2 as the subheadline, and the paragraph.
 * H3, H4, and the long description stay in the doc.
 */

export type ArchetypePageCopy = {
  h1: string;
  subheadline: string;
  description: string;
};

export const ARCHETYPE_PAGE_COPY: Record<string, ArchetypePageCopy> = {
  steward: {
    h1: "You belong with people who protect what is good and take their time making it.",
    subheadline: "You belong with people who keep the fire, and who value the time the making takes.",
    description:
      "The Steward keeps the fire and values the time the process takes. That time is how the work stays good, and how its warmth is shared with the person it is for. There is a place beside the fire for them. If you work this way, you will know the other one when you meet them.",
  },
  shepherd: {
    h1: "You belong with people who want more people included, without weakening what they already have.",
    subheadline:
      "You belong with people who can open the circle wider and still keep the welcome warm.",
    description:
      "The Shepherd carries what is good to more people. The roots stay: human, steady, unwilling to water the principle down. What changes is the size of the welcome. A larger crowd that no longer knows itself is not the win. A larger circle that still does is. You are looking for the brand or the creator who can widen the door and keep the room kind.",
  },
  conservator: {
    h1: "You belong with people who care that the work is done right, and that it stays that way.",
    subheadline:
      "You belong with people who still recognize the work after other hands have touched it.",
    description:
      "The Conservator keeps excellence from depending on one careful person in the room. Order, here, is a kindness. It is how the work survives contact with other hands and still comes out exact. If you only relax when the other person is as exact as you are, this is the partner you have been listening for.",
  },
  "institution-builder": {
    h1: "You belong with people who want to build something that lasts longer than one project.",
    subheadline:
      "You belong with people who are willing to keep building after the first campaign has gone quiet.",
    description:
      "The Institution Builder thinks past the current project. The horizon is years. The draw is something durable: a company, a show, a network, a practice that later work can stand on. One good collaboration is a beginning. The thing that remains is the partnership they came to make.",
  },
  "artisan-reformer": {
    h1: "You belong with people who change things by making them better and more personal.",
    subheadline:
      "You belong with people who set a better, more human thing beside the old one, and let people feel the difference.",
    description:
      "The Artisan Reformer changes the work by making it. The new version stays intimate enough to hold. People choose it because they can feel it, not because they were argued toward it. If you trust a made thing more than a manifesto, this is the partner whose table you want.",
  },
  catalyst: {
    h1: "You belong with people who can get others to care, and to move with them.",
    subheadline:
      "You belong with people who can turn a private conviction into a fire a whole group will stand near.",
    description:
      "The Catalyst wants change that reaches people. They can see what has worn out, set a better way of living beside it, and bring a group along while the reason is still warm. The people are the point. The size of the group matters only if the reason survives the trip. If you need a partner who can make others care and then actually go, you are close.",
  },
  designer: {
    h1: "You belong with people who fix a broken way of working by redesigning it.",
    subheadline:
      "You belong with people who will rebuild how the work is made, not only how it looks once it is finished.",
    description:
      "The Designer reimagines the work through form, care, and intention. The blueprint comes before the announcement. A broken brief, a clumsy handoff, a partnership that only works when everyone is excited: these are joints, and this partner can hear them fail. If you would rather redraw the thing than decorate it, you belong with them.",
  },
  architect: {
    h1: "You belong with the people building a world that has room for you in it.",
    subheadline:
      "You belong with people laying out a world large enough that you can actually live and work inside it.",
    description:
      "The Architect builds at the scale of a field: a market, a culture, a network. The work looks for the place where a new structure gives people room they did not have. Nothing here erases the world already built. A further world is added, so the people who were missing a place can find one with their work intact.",
  },
};
