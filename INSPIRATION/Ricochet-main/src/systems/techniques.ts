export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type DemoGroup = 'economy' | 'scarcity' | 'progression' | 'gacha' | 'vip' | 'social' | 'exit' | 'visual' | 'privacy' | 'ads' | 'meta' | 'battlepass';

export interface Technique {
  name: string;
  category: string;
  source: string;
  risk: RiskLevel;
  tactic: string;
  demo: string;
  why: string;
  counter: string;
}

export const DEMO_GROUP: Record<string, DemoGroup> = {
  "currency": "economy",
  "price": "economy",
  "starter": "economy",
  "booster": "economy",
  "checkout": "economy",
  "hidden_total_price": "economy",
  "sneak_into_basket": "economy",
  "one_way_wallet": "economy",
  "lossy_bundle_math": "economy",
  "personalized_price_opacity": "economy",
  "post_purchase_upsell_cascade": "economy",
  "countdown": "scarcity",
  "dailydeal": "scarcity",
  "scarcity": "scarcity",
  "season": "scarcity",
  "event": "scarcity",
  "reset_countdown": "scarcity",
  "artificial_wait_skip": "scarcity",
  "energy": "progression",
  "inventory": "progression",
  "progress": "progression",
  "quest": "progression",
  "streak": "progression",
  "offline": "progression",
  "surprise": "progression",
  "achievement": "progression",
  "celebration": "progression",
  "endowed_progress_trap": "progression",
  "gacha": "gacha",
  "near_miss_monetization": "gacha",
  "vip": "vip",
  "whale": "vip",
  "social": "social",
  "comparison": "social",
  "leaderboard": "social",
  "fake_social_proof_counters": "social",
  "friend_spam_reward": "social",
  "exit": "exit",
  "cancel": "exit",
  "cancellation_survey_friction": "exit",
  "roach_motel_account": "exit",
  "emotional_exit_interrupt": "exit",
  "refund_deterrence": "exit",
  "multi_step_optout": "exit",
  "choice_overload_obstruction": "exit",
  "forced_account_price": "exit",
  "hierarchy": "visual",
  "interface_interference": "visual",
  "copy": "visual",
  "confirmshaming_consent": "visual",
  "misleading_disabled_state": "visual",
  "badge_inflation": "visual",
  "notification": "visual",
  "funnel": "visual",
  "privacy": "privacy",
  "consent": "privacy",
  "privacy_zuckering": "privacy",
  "prechecked_privacy": "privacy",
  "dark_nudging_defaults": "privacy",
  "permission_piggybacking": "privacy",
  "subscription": "privacy",
  "forced_continuity_hidden": "privacy",
  "renewal_ambiguity": "privacy",
  "ad": "ads",
  "disguised_ads": "ads",
  "fake_close_button": "ads",
  "rewarded_ad_bait_switch": "ads",
  "unclear_sponsored_ranking": "ads",
  "personalization": "meta",
  "analytics": "meta",
  "battlepass": "battlepass"
};

export const TECHNIQUES: Technique[] = [
  {
    "name": "Premium currency obfuscation",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Convert real money into gems/fragments so later purchases feel less like spending cash.",
    "demo": "currency",
    "why": "Reduces the pain of paying and makes unit prices hard to compare.",
    "counter": "Show real-money equivalent next to every virtual-currency price."
  },
  {
    "name": "Dual/tri-currency economy",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Use fragments, gems and energy for different sinks, making value harder to track.",
    "demo": "currency",
    "why": "Complexity weakens price memory and encourages top-ups.",
    "counter": "Keep currencies minimal and publish a conversion table."
  },
  {
    "name": "Large gem packs",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Offer increasingly large packs that leave residual currency after purchases.",
    "demo": "price",
    "why": "Breakage and leftover balances create a reason to buy again.",
    "counter": "Allow exact-price purchases and refunds of leftover balances."
  },
  {
    "name": "Bonus gems",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Add +50, +200, +1500 bonus gems to larger packs.",
    "demo": "price",
    "why": "Frames higher spend as savings even when it increases total outlay.",
    "counter": "Show effective price per item and the user's likely actual need."
  },
  {
    "name": "Best value badge",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Label a high-priced pack as BEST VALUE or MEGA DEAL.",
    "demo": "price",
    "why": "Guides attention toward the preferred revenue option.",
    "counter": "Base value labels on transparent unit economics."
  },
  {
    "name": "Popular badge",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Mark one pack as POPULAR to imply social proof.",
    "demo": "price",
    "why": "People infer that the popular choice is safer or smarter.",
    "counter": "Only use if based on real, recent, auditable sales data."
  },
  {
    "name": "Price anchoring",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Show a very high original price next to a much lower current price.",
    "demo": "price",
    "why": "The first number becomes the anchor, making the offer feel cheap.",
    "counter": "Do not invent reference prices; show verifiable historical prices."
  },
  {
    "name": "Strikethrough discount",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Use line-through originalPrice values such as $49.99 → $4.99.",
    "demo": "price",
    "why": "Creates a dramatic perceived bargain.",
    "counter": "Use only real, previously charged prices and disclose the comparison basis."
  },
  {
    "name": "First purchase bonus",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Add extra gems only on the first spend.",
    "demo": "price",
    "why": "Breaks the psychological barrier from non-payer to payer.",
    "counter": "Make first-purchase offers calm, transparent and non-expiring."
  },
  {
    "name": "Starter pack",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Bundle progress, currency, refills and rarity into a cheap early offer.",
    "demo": "starter",
    "why": "Targets players when motivation and uncertainty are highest.",
    "counter": "Avoid targeting new users before they understand the product."
  },
  {
    "name": "Kickstart bundle escalation",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Offer a small starter pack and a much larger mega bundle beside it.",
    "demo": "price",
    "why": "Creates an upsell ladder from cheap commitment to higher spend.",
    "counter": "Separate beginner help from monetized acceleration."
  },
  {
    "name": "Discount percentage framing",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Display 50%, 90% or similar savings labels on deals.",
    "demo": "price",
    "why": "Percentages feel concrete even when baseline is arbitrary.",
    "counter": "Show absolute price, original price history and limitations."
  },
  {
    "name": "Microtransaction boosters",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Sell short-duration boosts, teleports, refills and auto-collect.",
    "demo": "booster",
    "why": "Turns friction into recurring spend opportunities.",
    "counter": "Design friction for gameplay, not for monetization pressure."
  },
  {
    "name": "Pay-to-skip grind",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Let players buy resources, energy or multipliers to bypass waiting.",
    "demo": "booster",
    "why": "Transforms impatience and frustration into revenue.",
    "counter": "Keep progression enjoyable without payment."
  },
  {
    "name": "No-ads as paid relief",
    "category": "Currency & Pricing",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Make ad removal a VIP benefit.",
    "demo": "vip",
    "why": "Creates value by removing annoyance.",
    "counter": "Do not degrade the free experience to sell relief."
  },
  {
    "name": "Countdown timer",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Display a ticking timer on offers.",
    "demo": "countdown",
    "why": "Urgency suppresses deliberation.",
    "counter": "Use timers only for genuinely time-limited events."
  },
  {
    "name": "Flash sale modal",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Interrupt play with a short flash-sale overlay.",
    "demo": "countdown",
    "why": "Combines interruption, urgency and discount framing.",
    "counter": "Place optional offers in the shop, not in the middle of play."
  },
  {
    "name": "Last-minute notification",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Send a warning when only 60 seconds remain.",
    "demo": "notification",
    "why": "Last-chance framing exploits loss aversion.",
    "counter": "Let users opt out of promotional urgency."
  },
  {
    "name": "Daily deal rotation",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Rotate daily offers every 24 hours.",
    "demo": "dailydeal",
    "why": "Habit loop plus fear of missing today’s item.",
    "counter": "Make daily deals non-essential and replayable later."
  },
  {
    "name": "Limited stock",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Show stock counts like only 3 mythic items left.",
    "demo": "scarcity",
    "why": "Scarcity makes items feel more valuable.",
    "counter": "Use stock counts only if the supply is truly limited."
  },
  {
    "name": "Artificial stock decay",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Randomly reduce stock over time to simulate other buyers.",
    "demo": "scarcity",
    "why": "Creates false social proof and false scarcity.",
    "counter": "Never fake inventory movement."
  },
  {
    "name": "Seasonal event",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Attach exclusive items to a named seasonal festival.",
    "demo": "season",
    "why": "Makes content feel culturally timely and collectible.",
    "counter": "Offer fair reruns or clear archive paths."
  },
  {
    "name": "Never returns claim",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Say a limited event or item never returns.",
    "demo": "season",
    "why": "Maximizes FOMO and regret avoidance.",
    "counter": "Avoid irreversible scarcity, especially for minors."
  },
  {
    "name": "Scheduled events",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Create hourly/daily events like Golden Hour and Midnight Raid.",
    "demo": "event",
    "why": "Builds routines around external time windows.",
    "counter": "Use flexible windows and respect user schedules."
  },
  {
    "name": "VIP-only event weekends",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Reserve some high-multiplier events for VIP players.",
    "demo": "event",
    "why": "Combines status, time pressure and paywalling.",
    "counter": "Keep competitive or core events open to all players."
  },
  {
    "name": "Random flash event",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Use unpredictable events several times per day.",
    "demo": "event",
    "why": "Variable timing encourages checking back frequently.",
    "counter": "Let users set limits and receive non-promotional summaries."
  },
  {
    "name": "Event-start fanfare",
    "category": "Time Pressure & Scarcity",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Use confetti/sounds when events start.",
    "demo": "notification",
    "why": "Makes the timing moment feel urgent and celebratory.",
    "counter": "Use celebration for achievements, not pressure."
  },
  {
    "name": "Energy system",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Require energy to collect items and gate continued play.",
    "demo": "energy",
    "why": "Turns playtime into a depleting resource.",
    "counter": "Avoid artificial energy gates; let players take natural breaks."
  },
  {
    "name": "Out-of-energy modal",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "When energy hits zero, present refill/payment options.",
    "demo": "energy",
    "why": "Targets the exact moment of frustration.",
    "counter": "Offer free recovery first and avoid interruptive sales."
  },
  {
    "name": "Paid energy refill",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Charge gems for instant refills.",
    "demo": "energy",
    "why": "Converts waiting time into repeat purchases.",
    "counter": "Make energy cosmetic or optional, not core access."
  },
  {
    "name": "VIP energy regeneration",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Increase regen by VIP tier; highest tier has infinite energy.",
    "demo": "energy",
    "why": "Creates ongoing pressure to subscribe/upgrade.",
    "counter": "Avoid selling relief from intentional scarcity."
  },
  {
    "name": "Inventory limit",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Cap free inventory at 50 and premium at 500.",
    "demo": "inventory",
    "why": "Creates a storage bottleneck as collection grows.",
    "counter": "Give generous storage and clear management tools."
  },
  {
    "name": "Inventory-full modal",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Interrupt collection and offer an upgrade when inventory is full.",
    "demo": "inventory",
    "why": "Turns completion momentum into a sales moment.",
    "counter": "Let users discard, sort or earn storage through normal play."
  },
  {
    "name": "Progress wall",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Show a premium prompt after key levels like 10, 25 or 50.",
    "demo": "progress",
    "why": "Targets commitment milestones when sunk cost is rising.",
    "counter": "Do not gate core progression behind payment."
  },
  {
    "name": "Daily quests",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Give daily tasks with currency and XP rewards.",
    "demo": "quest",
    "why": "Creates a chore loop and daily obligation.",
    "counter": "Make quests optional, batchable and non-punitive."
  },
  {
    "name": "Quest with social task",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Reward playing with friends or meeting other players.",
    "demo": "social",
    "why": "Pulls social pressure into progression.",
    "counter": "Let solo players progress equally."
  },
  {
    "name": "Energy-spend quest",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Reward using a fixed amount of energy.",
    "demo": "energy",
    "why": "Encourages depletion that can trigger refill offers.",
    "counter": "Avoid goals that push users toward paid bottlenecks."
  },
  {
    "name": "Achievements",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Low",
    "tactic": "Long-term badges for actions and milestones.",
    "demo": "achievement",
    "why": "Provides completion goals and identity markers.",
    "counter": "Keep achievements skill/experience based, not spend based."
  },
  {
    "name": "Spending achievement",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Award titles for spending thresholds such as Supporter or Legend.",
    "demo": "achievement",
    "why": "Normalizes high spend as status and progress.",
    "counter": "Do not gamify spending totals."
  },
  {
    "name": "Level-up celebration",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Low",
    "tactic": "Use a large modal, glow and reward framing on level-up.",
    "demo": "celebration",
    "why": "Positive reinforcement strengthens the loop.",
    "counter": "Celebrate meaningful play without steering into purchases."
  },
  {
    "name": "Near-complete progress bars",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Show bars just short of completion.",
    "demo": "progress",
    "why": "Goal-gradient effect motivates one more action.",
    "counter": "Use honest progress and avoid paid shortcuts at near-completion."
  },
  {
    "name": "Endowed progress",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Start users with partial progress on a track or punch card.",
    "demo": "progress",
    "why": "People work harder when they feel already underway.",
    "counter": "Use for onboarding, not pressure."
  },
  {
    "name": "Offline rewards",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Give resources when the player returns.",
    "demo": "offline",
    "why": "Rewards re-entry and makes absence feel measurable.",
    "counter": "Avoid making absence feel like lost profit."
  },
  {
    "name": "Daily login streak",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Reward consecutive daily logins with a 7-day prize.",
    "demo": "streak",
    "why": "Uses habit formation and loss aversion.",
    "counter": "Allow streak freezes and no penalty for missing days."
  },
  {
    "name": "Streak warning",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Warn that streak progress will be lost.",
    "demo": "streak",
    "why": "Turns non-use into perceived loss.",
    "counter": "Phrase reminders neutrally and avoid guilt."
  },
  {
    "name": "Return bonus day 7 jackpot",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Make the final day reward much larger than earlier days.",
    "demo": "streak",
    "why": "Backloads value to keep the habit alive.",
    "counter": "Make rewards balanced and not dependent on daily compulsion."
  },
  {
    "name": "Combo/floating reward text",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Low",
    "tactic": "Show XP, fragments and combo popups constantly.",
    "demo": "celebration",
    "why": "Keeps the player in a feedback loop.",
    "counter": "Use feedback to clarify, not overwhelm."
  },
  {
    "name": "Surprise bonus",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Occasionally grant unexpected bonus rewards.",
    "demo": "surprise",
    "why": "Unexpected rewards are more memorable than predictable ones.",
    "counter": "Keep surprises non-monetized and never tied to spending."
  },
  {
    "name": "Post-purchase celebration",
    "category": "Progression & Retention",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Celebrate purchases with success modal, confetti and feed posts.",
    "demo": "celebration",
    "why": "Makes spending feel like achievement.",
    "counter": "Confirm purchase calmly and make refunds/canceling clear."
  },
  {
    "name": "Mystery box / loot box",
    "category": "Gacha & Variable Rewards",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Sell a random reward container for premium currency.",
    "demo": "gacha",
    "why": "Variable rewards can mimic gambling-like reinforcement.",
    "counter": "Avoid paid randomness; sell known items directly."
  },
  {
    "name": "Rarity ladder",
    "category": "Gacha & Variable Rewards",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Use common, rare, epic, legendary and mythic tiers.",
    "demo": "gacha",
    "why": "Scarce tiers create aspiration and chase behavior.",
    "counter": "Avoid rarity-based pressure; disclose probabilities plainly."
  },
  {
    "name": "Tiny mythic rate",
    "category": "Gacha & Variable Rewards",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Set mythic chance to 0.1%.",
    "demo": "gacha",
    "why": "Extremely low odds create long chase loops.",
    "counter": "Use caps, spending limits and direct alternatives."
  },
  {
    "name": "Pity timer",
    "category": "Gacha & Variable Rewards",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Guarantee legendary/mythic after many pulls.",
    "demo": "gacha",
    "why": "Makes each failed pull feel like progress toward a win.",
    "counter": "Treat pity as consumer protection, not as pressure copy."
  },
  {
    "name": "Box-opening animation delay",
    "category": "Gacha & Variable Rewards",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Delay reveal with spinning/slot-like animation.",
    "demo": "gacha",
    "why": "Suspense increases arousal and emotional salience.",
    "counter": "Keep reveal fast and non-casino-like."
  },
  {
    "name": "Rarity glow and sound",
    "category": "Gacha & Variable Rewards",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Use special colors, audio and confetti for rare pulls.",
    "demo": "gacha",
    "why": "Sensory spikes strengthen reward memory.",
    "counter": "Use restrained effects, especially for paid random rewards."
  },
  {
    "name": "Duplicate compensation",
    "category": "Gacha & Variable Rewards",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Convert duplicate prizes into fragments.",
    "demo": "gacha",
    "why": "Softens losses and makes bad pulls feel partially useful.",
    "counter": "Let users avoid duplicates or choose compensation before buying."
  },
  {
    "name": "VIP-gated loot pools",
    "category": "Gacha & Variable Rewards",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Restrict some rewards to higher VIP levels.",
    "demo": "gacha",
    "why": "Stacks paywall pressure on randomness.",
    "counter": "Do not combine paid randomness with paid eligibility gates."
  },
  {
    "name": "Ten-pull bundle pressure",
    "category": "Gacha & Variable Rewards",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Offer multiple boxes/pulls as a better value bundle.",
    "demo": "gacha",
    "why": "Encourages session spending rather than single decisions.",
    "counter": "Add spending reminders and cooling-off tools."
  },
  {
    "name": "Near-miss presentation",
    "category": "Gacha & Variable Rewards",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Show desirable items passing by during a spin even if not actually winnable.",
    "demo": "gacha",
    "why": "Near misses can encourage continued play.",
    "counter": "Never display outcomes that were not actually possible."
  },
  {
    "name": "VIP tier ladder",
    "category": "VIP & Status",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Bronze → Silver → Gold → Platinum → Diamond with escalating prices.",
    "demo": "vip",
    "why": "Turns payment into status progression.",
    "counter": "Keep memberships simple and value-based."
  },
  {
    "name": "High-tier anchoring",
    "category": "VIP & Status",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Show a very expensive top tier so mid tiers feel reasonable.",
    "demo": "vip",
    "why": "Anchors perception of price and status.",
    "counter": "Avoid manipulative price ladders."
  },
  {
    "name": "Highlighted recommended VIP tier",
    "category": "VIP & Status",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Scale or ring a preferred tier such as Gold.",
    "demo": "vip",
    "why": "Visual hierarchy directs selection.",
    "counter": "Explain recommendation criteria clearly."
  },
  {
    "name": "Exclusive cosmetics",
    "category": "VIP & Status",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Lock mythic colors, trails, auras or emotes behind VIP.",
    "demo": "vip",
    "why": "Uses identity, scarcity and status display.",
    "counter": "Keep exclusives cosmetic and avoid social shaming."
  },
  {
    "name": "Priority support benefit",
    "category": "VIP & Status",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Offer priority support to paying players.",
    "demo": "vip",
    "why": "Frames basic support quality as a premium privilege.",
    "counter": "Provide adequate support to all users."
  },
  {
    "name": "Whale recognition modal",
    "category": "VIP & Status",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Celebrate high-spending users with special title and bonus.",
    "demo": "whale",
    "why": "Encourages identity around extreme spending.",
    "counter": "Use spending-limit warnings, not whale celebration."
  },
  {
    "name": "Supporter euphemism",
    "category": "VIP & Status",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Rename spending achievements as Supporter or Legend.",
    "demo": "whale",
    "why": "Makes payment sound noble or identity-enhancing.",
    "counter": "Use plain purchase language."
  },
  {
    "name": "VIP expiry",
    "category": "VIP & Status",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Membership lasts 30 days then expires.",
    "demo": "vip",
    "why": "Creates recurring retention and renewal pressure.",
    "counter": "Send clear renewal/cancellation reminders."
  },
  {
    "name": "Fake activity feed",
    "category": "Social Pressure",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Generate friends buying VIP or gem packs every 15 seconds.",
    "demo": "social",
    "why": "Creates false social proof and normalizes spending.",
    "counter": "Only show real activity with consent, or label as fictional."
  },
  {
    "name": "Friend purchase history",
    "category": "Social Pressure",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Show friends' last purchase and VIP level.",
    "demo": "social",
    "why": "Turns monetization into peer comparison.",
    "counter": "Do not expose purchase behavior socially by default."
  },
  {
    "name": "Social pressure popup",
    "category": "Social Pressure",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Say a friend needs help or is waiting.",
    "demo": "social",
    "why": "Uses obligation and fear of disappointing others.",
    "counter": "Use neutral invites and let users mute them."
  },
  {
    "name": "Social comparison modal",
    "category": "Social Pressure",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Show Sarah Level 87, Emma Level 23 and You Level 1.",
    "demo": "comparison",
    "why": "Makes the user feel behind.",
    "counter": "Offer personal progress views, not shame comparisons."
  },
  {
    "name": "Leaderboard with spenders",
    "category": "Social Pressure",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Include spent amounts and VIP levels in ranking data.",
    "demo": "leaderboard",
    "why": "Conflates spending with achievement and status.",
    "counter": "Rank by skill or fair gameplay, not payment."
  },
  {
    "name": "Online-now pressure",
    "category": "Social Pressure",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Show friends online, last seen now, current streaks.",
    "demo": "social",
    "why": "Creates immediacy and social obligation.",
    "counter": "Let users disable presence and use invisible mode."
  },
  {
    "name": "Clan/constellation weekly goal",
    "category": "Social Pressure",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Put the player into group goals with visible contributions.",
    "demo": "social",
    "why": "Group commitment makes absence feel costly.",
    "counter": "Avoid punitive group mechanics and spending tie-ins."
  },
  {
    "name": "Contribution comparison",
    "category": "Social Pressure",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Show your contribution beside friends' contributions.",
    "demo": "comparison",
    "why": "Motivates catch-up behavior.",
    "counter": "Make contribution private or encouragement-based."
  },
  {
    "name": "Quick-chat monetization prompt",
    "category": "Social Pressure",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Include a quick message like Buy gems!",
    "demo": "social",
    "why": "Normalizes spending requests inside social UX.",
    "counter": "Keep social chat free from monetization prompts."
  },
  {
    "name": "Friend-as-hook onboarding",
    "category": "Social Pressure",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Use a friendly named character asking for cooperation early.",
    "demo": "social",
    "why": "Humanizes the retention loop.",
    "counter": "Use characters for guidance, not pressure."
  },
  {
    "name": "Exit warning modal",
    "category": "Friction & Obstruction",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Show WAIT! with unclaimed value when quitting.",
    "demo": "exit",
    "why": "Interrupts user agency at the leaving moment.",
    "counter": "Let users leave cleanly; optionally save progress."
  },
  {
    "name": "Sunk cost reminder",
    "category": "Friction & Obstruction",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Tell users not to abandon their level, progress and total spent.",
    "demo": "exit",
    "why": "Weaponizes previous investment.",
    "counter": "Never use spend history to stop exit or cancellation."
  },
  {
    "name": "Low inventory warning",
    "category": "Friction & Obstruction",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Warn that the player is close to storage limit.",
    "demo": "inventory",
    "why": "Creates anticipatory anxiety before a paywall.",
    "counter": "Provide management tools before monetized expansion."
  },
  {
    "name": "Button hierarchy bias",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Make purchase CTA bright and dismiss link small/gray.",
    "demo": "hierarchy",
    "why": "Visual weight steers choices.",
    "counter": "Make accept/decline equally visible."
  },
  {
    "name": "Dismissive secondary copy",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Use weak alternatives like Later or Maybe later.",
    "demo": "hierarchy",
    "why": "Makes refusal feel temporary or inferior.",
    "counter": "Use clear labels: No thanks, Close, Not now."
  },
  {
    "name": "Modal stacking",
    "category": "Notifications & Interruption",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Trigger many monetization modals in the first minute.",
    "demo": "funnel",
    "why": "Repeated interruption increases chance of a click.",
    "counter": "Throttle prompts and prioritize player control."
  },
  {
    "name": "Timed upsell sequence",
    "category": "Notifications & Interruption",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Critical",
    "tactic": "Daily login → offline reward → first purchase → limited offer → social pressure → VIP → flash sale.",
    "demo": "funnel",
    "why": "A/B-testable funnel pressure rather than user need.",
    "counter": "Use one transparent onboarding message and no pressure sequence."
  },
  {
    "name": "Nagging",
    "category": "Notifications & Interruption",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Repeatedly re-show prompts after dismissal.",
    "demo": "notification",
    "why": "Persistence can wear down resistance.",
    "counter": "Respect dismissal and provide snooze/disable options."
  },
  {
    "name": "Urgent notification badge",
    "category": "Notifications & Interruption",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Use urgent badges and alarm language in notification center.",
    "demo": "notification",
    "why": "Makes commercial prompts feel operationally important.",
    "counter": "Separate gameplay alerts from promotional alerts."
  },
  {
    "name": "Promotional toast stream",
    "category": "Notifications & Interruption",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Show toasts about events, purchases, expiring offers and friends.",
    "demo": "notification",
    "why": "Keeps attention anchored to monetized opportunities.",
    "counter": "Let users filter notification categories."
  },
  {
    "name": "Screen shake / haptics",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Use vibration, shake and impact rings around rewards/offers.",
    "demo": "celebration",
    "why": "Increases arousal and perceived importance.",
    "counter": "Reserve haptics for meaningful gameplay feedback."
  },
  {
    "name": "Heroic purchase language",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Words like Divine, Titan, Celestial, Legend, God mode.",
    "demo": "copy",
    "why": "Elevates items and purchases into identity fantasy.",
    "counter": "Use descriptive names, not manipulative status language."
  },
  {
    "name": "Fear-of-loss copy",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Copy says expires soon, never returns, don't abandon, falling behind.",
    "demo": "copy",
    "why": "Loss language is more motivating than gain language.",
    "counter": "Use neutral informational copy."
  },
  {
    "name": "Confetti after spend",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Celebrate purchase as if it were skill achievement.",
    "demo": "celebration",
    "why": "Blurs spending and accomplishment.",
    "counter": "Keep purchase confirmations restrained."
  },
  {
    "name": "FOMO iconography",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Use warning icons, fire, lightning, crowns and sparkles.",
    "demo": "hierarchy",
    "why": "Symbols pre-classify offers as exciting or urgent.",
    "counter": "Use icons for navigation, not pressure."
  },
  {
    "name": "Rarity color coding",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Assign mythic/legendary glow colors.",
    "demo": "gacha",
    "why": "Makes rare items visually irresistible.",
    "counter": "Keep rarity clear but not exploitative."
  },
  {
    "name": "Soft moral framing",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Purchases are framed as support or helping the world.",
    "demo": "copy",
    "why": "Reduces guilt by giving spending a moral purpose.",
    "counter": "Be explicit: purchase supports development, if true."
  },
  {
    "name": "Premium progress visibility",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Show locked premium rewards beside free rewards.",
    "demo": "battlepass",
    "why": "Makes users repeatedly see what they are missing.",
    "counter": "Let users hide premium tracks."
  },
  {
    "name": "Reward shower",
    "category": "Visual Hierarchy & Copy",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Low",
    "tactic": "Flood the screen with fragments, XP and bonus numbers.",
    "demo": "celebration",
    "why": "Creates a feeling of constant gain.",
    "counter": "Keep feedback legible and not monetized."
  },
  {
    "name": "Battle pass",
    "category": "Battle Pass & Live Service",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Sell a premium progression track with 100 tiers.",
    "demo": "battlepass",
    "why": "Creates a season-long commitment loop.",
    "counter": "Avoid expiring paid progress; allow completion at the user's pace."
  },
  {
    "name": "Free vs premium comparison",
    "category": "Battle Pass & Live Service",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Show sparse free rewards beside dense premium rewards.",
    "demo": "battlepass",
    "why": "Makes the free track feel inferior.",
    "counter": "Keep free rewards meaningful."
  },
  {
    "name": "Premium retroactive value",
    "category": "Battle Pass & Live Service",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Let buying premium unlock accumulated premium rewards.",
    "demo": "battlepass",
    "why": "Sunk-cost effect: the more you played, the more value feels trapped.",
    "counter": "Be clear from the start and avoid expiry."
  },
  {
    "name": "Exclusive season rewards",
    "category": "Battle Pass & Live Service",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Put unique cosmetics in a time-limited pass.",
    "demo": "battlepass",
    "why": "Combines scarcity with completion pressure.",
    "counter": "Provide non-expiring paths or later reruns."
  },
  {
    "name": "Monthly/weekly event calendar",
    "category": "Battle Pass & Live Service",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Keep a calendar of rewards and multipliers.",
    "demo": "event",
    "why": "Turns the game into a schedule.",
    "counter": "Respect player time with flexible windows."
  },
  {
    "name": "Multiple overlapping systems",
    "category": "Battle Pass & Live Service",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Run quests, achievements, events, pass, VIP, shop and gacha at once.",
    "demo": "funnel",
    "why": "Overload makes users follow prompts rather than deliberate.",
    "counter": "Reduce systems and prioritize clarity."
  },
  {
    "name": "Live-service fear of falling behind",
    "category": "Battle Pass & Live Service",
    "source": "Extracted from ember_polished.jsx",
    "risk": "High",
    "tactic": "Use seasonal timers, streaks, social ranks and limited rewards together.",
    "demo": "comparison",
    "why": "Creates persistent background pressure.",
    "counter": "Design for return because the game is good, not because absence hurts."
  },
  {
    "name": "Collection completion pressure",
    "category": "Battle Pass & Live Service",
    "source": "Extracted from ember_polished.jsx",
    "risk": "Medium",
    "tactic": "Large cosmetic catalog with rarity and ownership tracking.",
    "demo": "inventory",
    "why": "Completionists feel compelled to fill gaps.",
    "counter": "Make collections non-expiring and clearly optional."
  },
  {
    "name": "Forced continuity",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Free trial silently converts to paid subscription unless canceled.",
    "demo": "subscription",
    "why": "Users underestimate future cancellation friction.",
    "counter": "Require explicit renewal consent and reminders."
  },
  {
    "name": "Roach motel cancellation",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Easy to sign up, hard to cancel.",
    "demo": "cancel",
    "why": "Obstruction preserves revenue after user intent changes.",
    "counter": "Make cancellation as easy as signup."
  },
  {
    "name": "Multiple-save cancellation flow",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Show repeated discounts or warnings before cancellation completes.",
    "demo": "cancel",
    "why": "Adds friction at the point of user agency.",
    "counter": "One confirmation step is enough."
  },
  {
    "name": "Hidden cancellation route",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Place cancel under support, chatbot or obscure settings.",
    "demo": "cancel",
    "why": "Increases abandonment of cancellation attempts.",
    "counter": "Put cancel in account/billing with clear labels."
  },
  {
    "name": "Preselected add-ons",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Check optional paid add-ons by default.",
    "demo": "checkout",
    "why": "Default effect turns inaction into consent.",
    "counter": "Require opt-in for all paid add-ons."
  },
  {
    "name": "Sneaking into basket",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Add insurance, protection or donation during checkout.",
    "demo": "checkout",
    "why": "Users may miss extra costs in a fast flow.",
    "counter": "Never add optional items without explicit action."
  },
  {
    "name": "Drip pricing",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Reveal mandatory fees late in checkout.",
    "demo": "checkout",
    "why": "Commitment rises before real price appears.",
    "counter": "Show full total upfront."
  },
  {
    "name": "Hidden fees",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Bury service fees, processing fees or taxes until final step.",
    "demo": "checkout",
    "why": "Makes comparison shopping harder.",
    "counter": "Disclose all fees before user invests time."
  },
  {
    "name": "Bait and switch",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "A button or promise leads to a different outcome than expected.",
    "demo": "checkout",
    "why": "Violates user expectations directly.",
    "counter": "Match labels exactly to outcomes."
  },
  {
    "name": "Disguised ads",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Make paid placement look like organic content.",
    "demo": "ad",
    "why": "Users mistake advertising for recommendation.",
    "counter": "Clearly label sponsored content."
  },
  {
    "name": "Privacy zuckering",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Nudge users to share more data than intended.",
    "demo": "privacy",
    "why": "Data extraction is hidden behind convenience or social features.",
    "counter": "Practice data minimization and plain consent."
  },
  {
    "name": "Cookie banner imbalance",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Make Accept all prominent and Reject all hidden.",
    "demo": "consent",
    "why": "Visual hierarchy turns privacy choice into steering.",
    "counter": "Give equal prominence to accept and reject."
  },
  {
    "name": "Trick wording",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Use confusing negatives or double negatives around consent.",
    "demo": "copy",
    "why": "Users select the opposite of what they intended.",
    "counter": "Use simple, direct labels."
  },
  {
    "name": "Confirmshaming",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Make refusal sound foolish, e.g. No, I hate saving money.",
    "demo": "copy",
    "why": "Adds social/emotional cost to declining.",
    "counter": "Use respectful decline copy."
  },
  {
    "name": "Forced registration",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Medium",
    "tactic": "Require account creation before showing information or prices.",
    "demo": "privacy",
    "why": "Captures data before value is clear.",
    "counter": "Allow browsing and guest checkout."
  },
  {
    "name": "Comparison prevention",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Medium",
    "tactic": "Make plans hard to compare or hide unit prices.",
    "demo": "price",
    "why": "Users pick based on salience rather than value.",
    "counter": "Offer clear comparison tables."
  },
  {
    "name": "Manipulative personalization",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Target pressure based on vulnerability, spend history or behavior.",
    "demo": "personalization",
    "why": "Optimizes persuasion against individual weak points.",
    "counter": "Use personalization for relevance, not exploitation."
  },
  {
    "name": "Dark defaults",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Set privacy-invasive or paid options as the default.",
    "demo": "consent",
    "why": "Defaults are powerful because many users do not change them.",
    "counter": "Set privacy-protective defaults."
  },
  {
    "name": "Obstructive unsubscribe",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Require login, survey or multi-step flow to stop emails.",
    "demo": "cancel",
    "why": "Friction keeps unwanted communication alive.",
    "counter": "One-click unsubscribe for marketing."
  },
  {
    "name": "Scarcity with no proof",
    "category": "Time Pressure & Scarcity",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Use only X left without evidence or actual inventory.",
    "demo": "scarcity",
    "why": "False scarcity directly manipulates urgency.",
    "counter": "Do not display scarcity unless it is true and auditable."
  },
  {
    "name": "Fake reviews/testimonials",
    "category": "Social Pressure",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Invent user praise or ratings.",
    "demo": "social",
    "why": "False proof reduces skepticism.",
    "counter": "Use verified reviews only."
  },
  {
    "name": "Infinite scroll",
    "category": "Progression & Retention",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Medium",
    "tactic": "Remove natural stopping points.",
    "demo": "funnel",
    "why": "Users continue consuming without a pause cue.",
    "counter": "Add session breakpoints and time awareness."
  },
  {
    "name": "Autoplay next",
    "category": "Progression & Retention",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Medium",
    "tactic": "Automatically start the next item/session.",
    "demo": "funnel",
    "why": "Shifts the default from stop to continue.",
    "counter": "Ask before continuing or provide easy disable."
  },
  {
    "name": "Notification permission priming",
    "category": "Notifications & Interruption",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Ask for notifications after showing a fake in-app prompt first.",
    "demo": "notification",
    "why": "Pre-suasion increases acceptance of system permission.",
    "counter": "Explain purpose and let users decide later."
  },
  {
    "name": "Dark pattern A/B optimization",
    "category": "Meta-System",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Optimize UI variants only for conversion, not regret or harm.",
    "demo": "analytics",
    "why": "The system learns which pressure works best.",
    "counter": "Track cancellations, refunds, complaints, regret and wellbeing."
  },
  {
    "name": "Vulnerability targeting",
    "category": "Meta-System",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Increase pressure for high spenders, minors, late-night users or distressed users.",
    "demo": "personalization",
    "why": "Exploits moments or people with reduced resistance.",
    "counter": "Add guardrails, cooldowns and age-appropriate protections."
  },
  {
    "name": "Spend threshold nudging",
    "category": "Meta-System",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Prompt users near a threshold to spend a little more.",
    "demo": "price",
    "why": "Goal-gradient plus sunk cost drives incremental spend.",
    "counter": "Warn users about cumulative spend instead."
  },
  {
    "name": "Loss-framed push notifications",
    "category": "Notifications & Interruption",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Your rewards are waiting / your streak is at risk.",
    "demo": "notification",
    "why": "Turns absence into anxiety.",
    "counter": "Use neutral reminders and frequency controls."
  },
  {
    "name": "Rewarded-ad pressure",
    "category": "Currency & Pricing",
    "source": "Added from wider dark-pattern taxonomy",
    "risk": "Medium",
    "tactic": "Offer ads as the easiest way around friction.",
    "demo": "ad",
    "why": "Monetizes frustration and time scarcity.",
    "counter": "Keep ads optional and never necessary for fair progress."
  },
  {
    "name": "Privacy Zuckering / Deceptive Cookie Banner",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "A blocking cookie modal makes “Accept all” bright and easy while hiding granular controls behind a confusing preferences screen where many toggles are already on.",
    "demo": "privacy_zuckering",
    "why": "Users want to reach the content quickly; contrast, defaults and extra steps push them toward maximum data sharing.",
    "counter": "Use equal-weight accept/reject buttons, no preselected non-essential cookies, and a clear one-screen preference panel."
  },
  {
    "name": "Forced Continuity / Hidden Subscription",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "A “free trial” CTA hides automatic conversion into an expensive recurring fee in tiny, low-contrast text.",
    "demo": "forced_continuity_hidden",
    "why": "The word “free” receives attention while renewal price, date and cancellation burden are visually minimized.",
    "counter": "Show renewal price, billing date and cancellation method directly beside the trial button in normal readable text."
  },
  {
    "name": "Artificial Waiting / Pay-to-Skip Timer",
    "category": "Time Pressure & Scarcity",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "An arbitrary wait timer blocks progress, while premium currency can instantly skip the wait.",
    "demo": "artificial_wait_skip",
    "why": "The product manufactures impatience and then sells relief from the friction it created.",
    "counter": "Use timers only when they serve gameplay balance; never make payment the only practical escape from artificial delay."
  },
  {
    "name": "Disguised Ads / Native Notification Impersonation",
    "category": "Ads & Native Deception",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "An advertisement is styled like a system notification, download button, warning dialog or native UI element to trick clicks.",
    "demo": "disguised_ads",
    "why": "People trust familiar system patterns and may click before realizing it is paid advertising.",
    "counter": "Label ads clearly, visually separate them from product UI, and never imitate operating-system controls."
  },
  {
    "name": "Pre-Checked Privacy Toggles",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Non-essential data-sharing switches are enabled by default in a preference panel.",
    "demo": "prechecked_privacy",
    "why": "Many users assume defaults are recommended or safe, and few inspect every toggle.",
    "counter": "Default optional tracking to off and require a clear affirmative action for consent."
  },
  {
    "name": "Consent Confirmshaming",
    "category": "Visual Hierarchy & Copy",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "The reject choice uses guilt-inducing copy such as “No, I do not want a better experience.”",
    "demo": "confirmshaming_consent",
    "why": "It adds emotional cost to a privacy-protective choice.",
    "counter": "Use neutral copy such as “Reject non-essential cookies.”"
  },
  {
    "name": "Multi-Step Opt-Out Obstruction",
    "category": "Friction & Obstruction",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Opting out requires several screens, hidden categories, repeated saves or extra confirmation.",
    "demo": "multi_step_optout",
    "why": "Each step creates drop-off and fatigue, so more users remain opted in.",
    "counter": "Make opting out as easy as opting in."
  },
  {
    "name": "Countdown That Resets",
    "category": "Time Pressure & Scarcity",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "A sale timer appears to expire but quietly restarts or extends when the user returns.",
    "demo": "reset_countdown",
    "why": "The timer creates urgency while the reset reveals that scarcity was artificial.",
    "counter": "Use real expiry times and remove the offer when the timer ends."
  },
  {
    "name": "Roach Motel Account Deletion",
    "category": "Friction & Obstruction",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Creating an account is one click, but deletion requires hidden menus, surveys, support contact or waiting periods.",
    "demo": "roach_motel_account",
    "why": "Users can enter easily but escape only through costly friction.",
    "counter": "Provide self-serve deletion that is no harder than account creation."
  },
  {
    "name": "Interface Interference Through Visual Hierarchy",
    "category": "Visual Hierarchy & Copy",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "The desired business choice is large, colorful and centered; the user-protective choice is tiny, grey or off-screen.",
    "demo": "interface_interference",
    "why": "Attention is not distributed evenly, so the design nudges without changing the words.",
    "counter": "Present materially different choices with comparable size, contrast and placement."
  },
  {
    "name": "Hidden Total Price / Drip Pricing",
    "category": "Currency & Pricing",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "The product advertises a low headline price, then reveals fees, service charges or required add-ons late in checkout.",
    "demo": "hidden_total_price",
    "why": "Users anchor on the first price and are reluctant to abandon after investing time.",
    "counter": "Show the full mandatory price from the first price presentation."
  },
  {
    "name": "Sneak Into Basket / Auto-Added Extras",
    "category": "Currency & Pricing",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Extra products, insurance, renewals or donations appear in the basket by default.",
    "demo": "sneak_into_basket",
    "why": "Users may not notice the extra line items or may assume they are required.",
    "counter": "Never add optional paid items without an explicit user action."
  },
  {
    "name": "Fake Social Proof Counters",
    "category": "Social Pressure",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "The UI claims thousands of buyers, viewers or active users without reliable evidence.",
    "demo": "fake_social_proof_counters",
    "why": "Popularity signals reduce skepticism and make hesitation feel irrational.",
    "counter": "Use verified, auditable metrics or omit the claim."
  },
  {
    "name": "Subscription Renewal Ambiguity",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "The UI obscures whether the user is choosing monthly, annual, trial, renewal, auto-renewal or one-time payment.",
    "demo": "renewal_ambiguity",
    "why": "Confusing billing language makes recurring commitment feel like a single purchase.",
    "counter": "State “renews automatically”, amount, frequency and date in plain language."
  },
  {
    "name": "Cancellation Survey Friction",
    "category": "Friction & Obstruction",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "The cancellation path forces the user through mandatory reasons, offers, warnings and repeated confirmations.",
    "demo": "cancellation_survey_friction",
    "why": "Friction and second-guessing retain users who already decided to leave.",
    "counter": "Make surveys optional and put the final cancellation button first."
  },
  {
    "name": "Misleading Disabled State",
    "category": "Visual Hierarchy & Copy",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "A reject or skip option is shown in grey so it looks unavailable even though it is clickable.",
    "demo": "misleading_disabled_state",
    "why": "Users may not attempt an option that appears disabled.",
    "counter": "Use standard enabled/disabled states honestly and consistently."
  },
  {
    "name": "Emotional Exit Interruption",
    "category": "Friction & Obstruction",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Medium",
    "tactic": "When the user tries to leave, the UI displays sadness, loss, abandoned characters or guilt-laden messaging.",
    "demo": "emotional_exit_interrupt",
    "why": "Social-emotional cues can override a rational stopping decision.",
    "counter": "Respect the exit action and use neutral wording."
  },
  {
    "name": "Rewarded-Ad Bait-and-Switch",
    "category": "Ads & Native Deception",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "The user watches an ad for a promised reward, then the reward is reduced, delayed, randomized or locked behind another action.",
    "demo": "rewarded_ad_bait_switch",
    "why": "The user has already spent attention and feels pressure to continue until the promised value appears.",
    "counter": "Deliver the advertised reward immediately and exactly as described."
  },
  {
    "name": "Dark Nudging Through Default Settings",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "The safest, cheapest or least invasive option is not the default; the business-favorable option is preselected.",
    "demo": "dark_nudging_defaults",
    "why": "Defaults exploit inertia and the assumption that the preset option is normal.",
    "counter": "Set defaults to the user-protective baseline and require active selection for upgrades."
  },
  {
    "name": "Choice Overload as Obstruction",
    "category": "Friction & Obstruction",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "The privacy or cancellation interface overwhelms users with dozens of categories and switches.",
    "demo": "choice_overload_obstruction",
    "why": "Complexity creates exhaustion; users accept all just to finish.",
    "counter": "Provide a simple global reject/accept choice plus optional granular controls."
  },
  {
    "name": "Forced Account Creation Before Price Reveal",
    "category": "Friction & Obstruction",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "The user must create an account or provide personal details before seeing final price, availability or key terms.",
    "demo": "forced_account_price",
    "why": "Once registered, the user feels invested and may tolerate worse terms.",
    "counter": "Reveal price, terms and availability before sign-up."
  },
  {
    "name": "Permission Piggybacking",
    "category": "Subscription, Consent & Privacy",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "A legitimate permission request is bundled with unrelated tracking, contacts, notifications or personalization consent.",
    "demo": "permission_piggybacking",
    "why": "Users approve one reasonable purpose and accidentally grant several unrelated ones.",
    "counter": "Ask for each permission just in time, with a narrow purpose and separate choice."
  },
  {
    "name": "Fake Close Button",
    "category": "Ads & Native Deception",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "An X or close icon inside an ad opens the ad instead of closing it, or is positioned to cause accidental clicks.",
    "demo": "fake_close_button",
    "why": "Users follow learned UI behavior and trigger the advertiser goal.",
    "counter": "Make close controls truthful, large enough and separate from the ad click area."
  },
  {
    "name": "Notification Badge Inflation",
    "category": "Notifications & Interruption",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Medium",
    "tactic": "The UI shows red badges for low-value or invented updates to pull users back into menus.",
    "demo": "badge_inflation",
    "why": "Badges exploit the urge to clear alerts and discover what is pending.",
    "counter": "Use badges only for meaningful, user-requested or time-sensitive information."
  },
  {
    "name": "One-Way Wallet Top-Up",
    "category": "Currency & Pricing",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Users can easily convert cash into virtual currency, but cannot cash out or refund unused balances.",
    "demo": "one_way_wallet",
    "why": "Leftover balance becomes sunk cost and motivates future purchases.",
    "counter": "Allow exact purchase amounts or easy refund of unused wallet credit."
  },
  {
    "name": "Refund Deterrence Copy",
    "category": "Friction & Obstruction",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Refund flows warn about losing status, access, streaks or account standing in exaggerated language.",
    "demo": "refund_deterrence",
    "why": "Fear of punishment discourages valid refund requests.",
    "counter": "Explain factual consequences only and provide a straightforward refund path."
  },
  {
    "name": "Personalized Price Opacity",
    "category": "Currency & Pricing",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Critical",
    "tactic": "Different users see different prices or offers based on behavior without transparency.",
    "demo": "personalized_price_opacity",
    "why": "Users cannot know whether they are being charged more because of vulnerability, location or spending history.",
    "counter": "Disclose personalized pricing and avoid targeting vulnerability."
  },
  {
    "name": "Friend-Spam Invitation Reward",
    "category": "Social Pressure",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "The game rewards users for inviting or pinging friends repeatedly, turning social relationships into growth tools.",
    "demo": "friend_spam_reward",
    "why": "Players externalize pressure onto friends to collect rewards.",
    "counter": "Limit invites, require consent, and avoid rewards for spam-like behavior."
  },
  {
    "name": "Endowed Progress Trap",
    "category": "Progression & Retention",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Medium",
    "tactic": "A progress bar starts partially filled to create a feeling that the user already owns part of the goal.",
    "demo": "endowed_progress_trap",
    "why": "People work harder to complete goals that appear already underway.",
    "counter": "Use honest progress and avoid presenting unearned progress as a loss risk."
  },
  {
    "name": "Near-Miss Monetization",
    "category": "Gacha & Variable Rewards",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "The animation almost lands on a rare reward, then misses and offers another paid attempt.",
    "demo": "near_miss_monetization",
    "why": "Near misses intensify motivation by implying success was close.",
    "counter": "Avoid paid randomness and especially avoid near-miss animations."
  },
  {
    "name": "Lossy Bundle Math",
    "category": "Currency & Pricing",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "Medium",
    "tactic": "Bundles mix currencies, items and bonuses so the real unit value becomes impossible to calculate quickly.",
    "demo": "lossy_bundle_math",
    "why": "The apparent value is high, but comparison is cognitively expensive.",
    "counter": "Show unit values, cash equivalents and what is actually needed for common purchases."
  },
  {
    "name": "Post-Purchase Upsell Cascade",
    "category": "Currency & Pricing",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Immediately after purchase, the UI presents another better offer while the user is already in a spending mindset.",
    "demo": "post_purchase_upsell_cascade",
    "why": "Payment lowers resistance and can trigger a momentum effect.",
    "counter": "Add cooldowns after purchase and show spending summaries instead of more offers."
  },
  {
    "name": "Unclear Sponsored Ranking",
    "category": "Ads & Native Deception",
    "source": "Added from user review + wider dark-pattern taxonomy",
    "risk": "High",
    "tactic": "Paid listings are blended into recommendations or rankings without obvious sponsorship labeling.",
    "demo": "unclear_sponsored_ranking",
    "why": "Users assume ranking reflects quality or relevance rather than payment.",
    "counter": "Clearly label paid placement and separate it from organic ranking."
  }
];
