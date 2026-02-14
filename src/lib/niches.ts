/**
 * Niche Definitions — predefined niches with topic seeds,
 * psychological triggers, and CTA templates.
 */

export interface NicheConfig {
  id: string;
  label: string;
  topicSeeds: string[];
  psychTriggers: string[];
  ctaTemplates: string[];
  hashtags: { youtube: string[]; instagram: string[] };
}

export const NICHE_CONFIGS: Record<string, NicheConfig> = {
  tech: {
    id: "tech",
    label: "Tech",
    topicSeeds: [
      "latest tech innovation",
      "gadgets that changed the world",
      "tech companies nobody talks about",
      "why this tech will disappear in 5 years",
      "biggest tech fails of all time",
      "tech that was ahead of its time",
      "dark side of big tech",
      "most underrated tech of the year",
    ],
    psychTriggers: [
      "curiosity_loop",
      "pattern_interrupt",
      "shock_claim",
    ],
    ctaTemplates: [
      "Follow for daily tech insights",
      "Subscribe to never miss a tech update",
      "Drop a comment — what tech blows your mind?",
    ],
    hashtags: {
      youtube: ["#Tech", "#Technology", "#Gadgets", "#TechNews", "#Shorts"],
      instagram: ["#tech", "#technology", "#gadgets", "#innovation", "#techie", "#techreels"],
    },
  },
  ai: {
    id: "ai",
    label: "AI",
    topicSeeds: [
      "AI breakthroughs happening right now",
      "jobs AI will replace this year",
      "AI tools that save 10 hours per week",
      "the scary truth about AI advancement",
      "how to use AI to make money",
      "AI vs human creativity",
      "AI predictions that came true",
      "free AI tools nobody knows about",
    ],
    psychTriggers: [
      "fear_of_missing_out",
      "curiosity_loop",
      "value_bomb",
    ],
    ctaTemplates: [
      "Follow for more AI secrets",
      "Like if AI fascinates you",
      "Comment your favorite AI tool below",
    ],
    hashtags: {
      youtube: ["#AI", "#ArtificialIntelligence", "#MachineLearning", "#AITools", "#Shorts"],
      instagram: ["#ai", "#artificialintelligence", "#aitools", "#machinelearning", "#futuretech"],
    },
  },
  "ai-motivation": {
    id: "ai-motivation",
    label: "AI Motivation",
    topicSeeds: [
      "how AI entrepreneurs think differently",
      "the mindset behind AI innovation",
      "why most people fail at using AI",
      "AI success stories that inspire",
      "the future belongs to AI-literate people",
      "how to stay relevant in the AI age",
      "discipline beats talent in the AI era",
      "harsh truths about the AI revolution",
    ],
    psychTriggers: [
      "identity_shift",
      "urgency",
      "value_bomb",
    ],
    ctaTemplates: [
      "Follow for daily AI motivation",
      "Share this with someone who needs it",
      "Tag a future AI leader",
    ],
    hashtags: {
      youtube: ["#AIMotivation", "#Motivation", "#AI", "#Success", "#Shorts"],
      instagram: ["#aimotivation", "#motivation", "#mindset", "#success", "#grind", "#aireels"],
    },
  },
  "finance-tech": {
    id: "finance-tech",
    label: "Finance + Tech",
    topicSeeds: [
      "fintech disrupting traditional banking",
      "crypto technology explained simply",
      "how tech billionaires invest",
      "the future of digital payments",
      "wealth building with technology",
      "trading algorithms explained",
      "passive income through tech",
      "financial mistakes tech people make",
    ],
    psychTriggers: [
      "greed_trigger",
      "fear_of_missing_out",
      "authority_position",
    ],
    ctaTemplates: [
      "Follow to level up your finances",
      "Save this for later",
      "Comment your biggest money lesson",
    ],
    hashtags: {
      youtube: ["#FinTech", "#Finance", "#Tech", "#Money", "#Investing", "#Shorts"],
      instagram: ["#fintech", "#finance", "#investing", "#money", "#wealth", "#techfinance"],
    },
  },
  "future-tech": {
    id: "future-tech",
    label: "Future Tech",
    topicSeeds: [
      "technology that will change everything by 2030",
      "quantum computing breakthroughs",
      "the metaverse reality check",
      "brain-computer interfaces progress",
      "space technology innovations",
      "robotics replacing human jobs",
      "biotech that sounds like science fiction",
      "what the internet looks like in 2035",
    ],
    psychTriggers: [
      "curiosity_loop",
      "shock_claim",
      "future_pacing",
    ],
    ctaTemplates: [
      "Follow to see the future first",
      "Subscribe for mind-blowing tech",
      "What future tech excites you most? Comment below",
    ],
    hashtags: {
      youtube: ["#FutureTech", "#Future", "#Innovation", "#Technology", "#Shorts"],
      instagram: ["#futuretech", "#innovation", "#futuristic", "#technology", "#quantum", "#space"],
    },
  },
  productivity: {
    id: "productivity",
    label: "Productivity",
    topicSeeds: [
      "morning routines of ultra-productive people",
      "productivity hacks backed by science",
      "apps that 10x your output",
      "time management secrets of CEOs",
      "why multitasking is destroying your focus",
      "the 2-minute rule that changes everything",
      "deep work strategies nobody teaches",
      "digital minimalism for productivity",
    ],
    psychTriggers: [
      "value_bomb",
      "identity_shift",
      "pain_agitation",
    ],
    ctaTemplates: [
      "Follow for daily productivity tips",
      "Save this — you'll need it",
      "Try this and thank me later",
    ],
    hashtags: {
      youtube: ["#Productivity", "#TimeManagement", "#Habits", "#Success", "#Shorts"],
      instagram: ["#productivity", "#timemanagement", "#habits", "#success", "#grindset", "#focus"],
    },
  },
  startup: {
    id: "startup",
    label: "Startup / Entrepreneurship",
    topicSeeds: [
      "startup ideas that actually work",
      "why 90% of startups fail",
      "bootstrapping vs raising funds",
      "lessons from failed entrepreneurs",
      "how to validate a business idea fast",
      "side hustles that became billion-dollar companies",
      "the lean startup methodology simplified",
      "networking secrets of successful founders",
    ],
    psychTriggers: [
      "authority_position",
      "value_bomb",
      "urgency",
    ],
    ctaTemplates: [
      "Follow for startup wisdom",
      "Building something? Drop it in the comments",
      "Share this with a fellow entrepreneur",
    ],
    hashtags: {
      youtube: ["#Startup", "#Entrepreneur", "#Business", "#Hustle", "#Shorts"],
      instagram: ["#startup", "#entrepreneur", "#business", "#hustle", "#founder", "#startuplife"],
    },
  },
};

export const NICHE_IDS = Object.keys(NICHE_CONFIGS);

export function getNicheConfig(nicheId: string): NicheConfig {
  const cfg = NICHE_CONFIGS[nicheId];
  if (!cfg) throw new Error(`Unknown niche: ${nicheId}`);
  return cfg;
}
