import React, { useState } from "react";
import { HelpCircle, ChevronRight, Award, Trophy, Eye, Check } from "lucide-react";
import { CarImage } from "../ui/CarImage";

interface Question {
  id: number;
  text: string;
  options: { label: string; score: string }[];
}

interface BYDQuizProps {
  authToken: string;
  onQuizSuccess: (newPoints: number) => void;
}

export const BYDQuiz: React.FC<BYDQuizProps> = ({
  authToken,
  onQuizSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [recommendedModel, setRecommendedModel] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

  const quizQuestions: Question[] = [
    { id: 1, text: "What is your primary driving environment typical pattern?", options: [{ label: "Urban commuter streets & city lane parking", score: "compact" }, { label: "Long-distance multi-state expressway touring", score: "sedan" }, { label: "Tough mountain trails and off-road exploration", score: "offroad" }, { label: "Executive business airport pickups & team shuttle", score: "mpv" }] },
    { id: 2, text: "What matters most to you in an advanced Electric Vehicle?", options: [{ label: "Incredible blade battery thermals safety record", score: "suv" }, { label: "Sub-3-second acceleration and sports torque stats", score: "sport" }, { label: "Budget-conscious energy saving & value pricing", score: "compact" }, { label: "Massive active cabin room & executive comfort", score: "mpv" }] },
    { id: 3, text: "How many passenger seats do you regularly coordinate?", options: [{ label: "Mainly solo driving or with one companion", score: "compact" }, { label: "Family of 4 with school bags & sports gear", score: "suv" }, { label: "Up to 7 people with full heavy suitcases", score: "mpv" }, { label: "Medium raw cargo freight and heavy utility tools", score: "offroad" }] },
    { id: 4, text: "Which visual aesthetic profile matches your lifestyle vibe?", options: [{ label: "Sleek low-slung aerodynamic sedan sportback", score: "sedan" }, { label: "Big, bold, muscular high-clearance offground SUV", score: "offroad" }, { label: "Agile, modern, cute and compact city hatch", score: "compact" }, { label: "Sophisticated premium limousine with chrome grilles", score: "mpv" }] },
    { id: 5, text: "What is your typical daily commute distance?", options: [{ label: "Under 20 miles — mostly short trips", score: "compact" }, { label: "20-50 miles — moderate highway use", score: "sedan" }, { label: "50-100 miles — heavy highway driving", score: "suv" }, { label: "100+ miles — long haul touring", score: "mpv" }] },
    { id: 6, text: "How important is autonomous driving technology to you?", options: [{ label: "Essential — I want full self-driving capability", score: "sedan" }, { label: "Nice to have — basic ADAS is enough", score: "compact" }, { label: "Not important — I prefer manual control", score: "offroad" }, { label: "Critical for passenger comfort and safety", score: "mpv" }] },
    { id: 7, text: "What charging infrastructure do you have access to?", options: [{ label: "Home garage with Level 2 charger", score: "suv" }, { label: "Workplace charging available daily", score: "compact" }, { label: "Only public fast chargers nearby", score: "sedan" }, { label: "No dedicated charging — rely on public network", score: "compact" }] },
    { id: 8, text: "What is your preferred driving style?", options: [{ label: "Smooth and efficient — eco mode always", score: "compact" }, { label: "Sporty — I love quick acceleration", score: "sport" }, { label: "Steady and confident — comfort priority", score: "sedan" }, { label: "Adventurous — off-road and terrain exploration", score: "offroad" }] },
    { id: 9, text: "How much cargo space do you typically need?", options: [{ label: "Minimal — a backpack and groceries", score: "compact" }, { label: "Moderate — weekend bags and sports equipment", score: "sedan" }, { label: "Large — camping gear, strollers, bulk items", score: "suv" }, { label: "Maximum — furniture, equipment, commercial loads", score: "mpv" }] },
    { id: 10, text: "What is your budget range for an electric vehicle?", options: [{ label: "Under $35,000 — value is king", score: "compact" }, { label: "$35,000 - $50,000 — balanced features", score: "sedan" }, { label: "$50,000 - $70,000 — premium experience", score: "suv" }, { label: "$70,000+ — no compromise on luxury", score: "mpv" }] },
    { id: 11, text: "How do you feel about vehicle size in urban environments?", options: [{ label: "Small is smart — easy parking and maneuvering", score: "compact" }, { label: "Medium is ideal — presence without hassle", score: "sedan" }, { label: "Large is fine — I'm confident behind the wheel", score: "suv" }, { label: "Size doesn't matter — I'll manage", score: "mpv" }] },
    { id: 12, text: "What role does brand prestige play in your decision?", options: [{ label: "Very important — I want to be seen", score: "mpv" }, { label: "Somewhat — I prefer underrated quality", score: "sedan" }, { label: "Not at all — performance speaks for itself", score: "compact" }, { label: "I prefer rugged utility over glamour", score: "offroad" }] },
    { id: 13, text: "How tech-savvy are you when it comes to car features?", options: [{ label: "Early adopter — I want the latest tech", score: "sedan" }, { label: "Moderate — I use what's practical", score: "compact" }, { label: "Minimalist — keep it simple", score: "offroad" }, { label: "I want everything — screens, AI, connectivity", score: "mpv" }] },
    { id: 14, text: "What weather conditions do you drive in most?", options: [{ label: "Sunny and dry — California vibes", score: "compact" }, { label: "Rain and snow — all-season capability needed", score: "suv" }, { label: "Extreme heat — cooling is priority", score: "sedan" }, { label: "Mixed — I need AWD versatility", score: "offroad" }] },
    { id: 15, text: "How often do you take road trips?", options: [{ label: "Rarely — I stay local", score: "compact" }, { label: "Monthly — weekend getaways", score: "sedan" }, { label: "Weekly — work or family travel", score: "suv" }, { label: "Constantly — I live on the road", score: "mpv" }] },
    { id: 16, text: "What type of seats do you prefer?", options: [{ label: "Sporty bucket seats with side support", score: "sport" }, { label: "Plush leather with massage and heating", score: "mpv" }, { label: "Practical and durable fabric", score: "compact" }, { label: "Elevated captain chairs with armrests", score: "suv" }] },
    { id: 17, text: "How important is cargo versatility (fold-flat seats, roof racks)?", options: [{ label: "Very — I haul equipment regularly", score: "offroad" }, { label: "Somewhat — occasional bike or luggage", score: "sedan" }, { label: "Not important — passenger space is key", score: "mpv" }, { label: "I just need a trunk for groceries", score: "compact" }] },
    { id: 18, text: "What is your top priority for infotainment?", options: [{ label: "Large touchscreen with navigation", score: "sedan" }, { label: "Premium sound system for music lovers", score: "sport" }, { label: "Simple radio and Bluetooth is enough", score: "compact" }, { label: "Rear entertainment for passengers", score: "mpv" }] },
    { id: 19, text: "How do you feel about electric vehicle range anxiety?", options: [{ label: "Worried — I need 400+ miles range", score: "suv" }, { label: "Moderate — 300 miles is fine", score: "sedan" }, { label: "Not worried — charging network is growing", score: "compact" }, { label: "I plan routes around charging stops", score: "mpv" }] },
    { id: 20, text: "What role does safety rating play in your choice?", options: [{ label: "Top priority — 5-star or nothing", score: "suv" }, { label: "Important but not the deciding factor", score: "sedan" }, { label: "I trust modern EV safety standards", score: "compact" }, { label: "I need airbags, cameras, and radar everywhere", score: "mpv" }] },
    { id: 21, text: "How many cars does your household currently have?", options: [{ label: "Just one — this will be my only car", score: "compact" }, { label: "Two — this replaces one of them", score: "sedan" }, { label: "Three or more — I need something specific", score: "suv" }, { label: "Zero — this is my first car", score: "compact" }] },
    { id: 22, text: "What is your primary reason for going electric?", options: [{ label: "Save money on fuel and maintenance", score: "compact" }, { label: "Reduce my carbon footprint", score: "sedan" }, { label: "Performance — instant torque is addictive", score: "sport" }, { label: "Status — driving the future", score: "mpv" }] },
    { id: 23, text: "How important is vehicle customization (colors, wraps, accessories)?", options: [{ label: "Very — I want a unique ride", score: "sport" }, { label: "Somewhat — a few personal touches", score: "sedan" }, { label: "Not at all — stock is fine", score: "compact" }, { label: "I want factory custom options", score: "mpv" }] },
    { id: 24, text: "What is your typical parking situation?", options: [{ label: "Street parking — tight spaces", score: "compact" }, { label: "Garage at home and work", score: "sedan" }, { label: "Open lots — size doesn't matter", score: "suv" }, { label: "Valet parking — impression matters", score: "mpv" }] },
    { id: 25, text: "How do you feel about subscription car services?", options: [{ label: "Love it — variety without commitment", score: "compact" }, { label: "Open to it — depends on the deal", score: "sedan" }, { label: "Prefer ownership — it's mine", score: "suv" }, { label: "Want both — own one, subscribe to another", score: "mpv" }] },
    { id: 26, text: "What is your ideal vehicle color?", options: [{ label: "Black or dark grey — sleek and stealthy", score: "sedan" }, { label: "White or silver — clean and modern", score: "compact" }, { label: "Bold red or blue — stand out", score: "sport" }, { label: "Earth tones — green, bronze, sand", score: "offroad" }] },
    { id: 27, text: "How often do you expect to charge your EV?", options: [{ label: "Daily — I drive a lot", score: "suv" }, { label: "Every 2-3 days — moderate use", score: "sedan" }, { label: "Once a week — light use", score: "compact" }, { label: "Whenever needed — no set schedule", score: "mpv" }] },
    { id: 28, text: "What feature excites you most about BYD vehicles?", options: [{ label: "Blade Battery safety technology", score: "suv" }, { label: "DM-i hybrid range extension", score: "sedan" }, { label: "Affordable pricing for premium features", score: "compact" }, { label: "Global racing pedigree and performance", score: "sport" }] },
    { id: 29, text: "How do you plan to use your Horizon Points?", options: [{ label: "Redeem for merchandise and accessories", score: "compact" }, { label: "Convert to crypto or cash", score: "sedan" }, { label: "Save for a vehicle down payment", score: "suv" }, { label: "Donate to environmental causes", score: "mpv" }] },
    { id: 30, text: "What matters most in after-sales service?", options: [{ label: "Fast turnaround on repairs", score: "compact" }, { label: "Comprehensive warranty coverage", score: "suv" }, { label: "Mobile service that comes to me", score: "sedan" }, { label: "Dedicated personal service advisor", score: "mpv" }] },
    { id: 31, text: "How important is regenerative braking to you?", options: [{ label: "Very — I want maximum energy recovery", score: "compact" }, { label: "Important — one-pedal driving is a must", score: "sedan" }, { label: "Neutral — I use traditional braking mostly", score: "suv" }, { label: "I prefer strong regen for hilly terrain", score: "offroad" }] },
    { id: 32, text: "What is your preferred test drive scenario?", options: [{ label: "City streets with stop-and-go traffic", score: "compact" }, { label: "Highway cruising at 70+ mph", score: "sedan" }, { label: "Mountain roads with tight corners", score: "sport" }, { label: "Mixed terrain including dirt roads", score: "offroad" }] },
    { id: 33, text: "How do you feel about vehicle-to-grid (V2G) technology?", options: [{ label: "Excited — I want to sell energy back", score: "compact" }, { label: "Interested — but not a dealbreaker", score: "sedan" }, { label: "Unsure — need to learn more", score: "suv" }, { label: "Not relevant to me", score: "mpv" }] },
    { id: 34, text: "What is your dream BYD model?", options: [{ label: "BYD Seal — the performance sedan", score: "sport" }, { label: "BYD Atto 3 — the versatile compact SUV", score: "suv" }, { label: "BYD Dolphin — the city-friendly hatch", score: "compact" }, { label: "BYD Han — the executive flagship", score: "mpv" }] },
    { id: 35, text: "How important is a panoramic sunroof to you?", options: [{ label: "Must have — I love open-air feeling", score: "mpv" }, { label: "Nice to have — but not essential", score: "sedan" }, { label: "Don't care — I prefer a solid roof", score: "compact" }, { label: "Prefer a convertible or T-top", score: "sport" }] },
    { id: 36, text: "What role does resale value play in your purchase?", options: [{ label: "Critical — I plan to sell in 3-5 years", score: "sedan" }, { label: "Important — but not the top factor", score: "suv" }, { label: "I keep cars until they die", score: "compact" }, { label: "I lease — resale doesn't matter", score: "mpv" }] },
    { id: 37, text: "How do you feel about over-the-air (OTA) updates?", options: [{ label: "Love it — my car gets better over time", score: "sedan" }, { label: "Useful — but I don't update often", score: "compact" }, { label: "Prefer traditional dealer updates", score: "suv" }, { label: "Worried about software bugs", score: "mpv" }] },
    { id: 38, text: "What is your ideal vehicle height?", options: [{ label: "Low and sporty — hug the road", score: "sport" }, { label: "Mid-height — comfortable entry/exit", score: "sedan" }, { label: "Tall and commanding — see everything", score: "suv" }, { label: "Doesn't matter — I'm adaptable", score: "compact" }] },
    { id: 39, text: "How important is a Heads-Up Display (HUD)?", options: [{ label: "Essential — I never look down at screens", score: "sedan" }, { label: "Useful — but I can live without it", score: "compact" }, { label: "Not important — I prefer the dashboard", score: "suv" }, { label: "Want it — for safety and convenience", score: "mpv" }] },
    { id: 40, text: "What is your preferred driving seat position?", options: [{ label: "Low and reclined — sport style", score: "sport" }, { label: "Upright with good visibility", score: "suv" }, { label: "Comfortable — slightly reclined", score: "sedan" }, { label: "Elevated — commanding view of the road", score: "mpv" }] },
    { id: 41, text: "How do you feel about autonomous parking?", options: [{ label: "Game changer — I hate parking", score: "compact" }, { label: "Useful in tight garages", score: "sedan" }, { label: "I prefer to park myself", score: "offroad" }, { label: "Essential for my large vehicle", score: "mpv" }] },
    { id: 42, text: "What is your primary use case for your vehicle?", options: [{ label: "Daily commute to work", score: "compact" }, { label: "Family transportation", score: "suv" }, { label: "Business and client meetings", score: "mpv" }, { label: "Weekend adventures and hobbies", score: "offroad" }] },
    { id: 43, text: "How important is vehicle sound insulation?", options: [{ label: "Very — I want a silent cabin", score: "mpv" }, { label: "Important — but I enjoy some engine sound", score: "sport" }, { label: "Neutral — EVs are quiet anyway", score: "compact" }, { label: "I prefer to hear the road", score: "offroad" }] },
    { id: 44, text: "What is your stance on vehicle subscriptions vs. ownership?", options: [{ label: "Ownership — it's an asset", score: "sedan" }, { label: "Subscription — flexibility is key", score: "compact" }, { label: "Lease — best of both worlds", score: "suv" }, { label: "Depends on the vehicle type", score: "mpv" }] },
    { id: 45, text: "How do you feel about BYD's global expansion?", options: [{ label: "Proud — BYD is the future of EVs", score: "sedan" }, { label: "Impressed — quality matches established brands", score: "suv" }, { label: "Cautious — need to see long-term reliability", score: "compact" }, { label: "Excited — more choices for consumers", score: "mpv" }] },
    { id: 46, text: "What is your ideal vehicle warranty length?", options: [{ label: "Lifetime — I want peace of mind forever", score: "suv" }, { label: "10 years / 100,000 miles — comprehensive", score: "sedan" }, { label: "5 years is standard — I'm fine with that", score: "compact" }, { label: "Extended warranty — I'll pay for extra coverage", score: "mpv" }] },
    { id: 47, text: "How important is a premium sound system?", options: [{ label: "Essential — I'm an audiophile", score: "mpv" }, { label: "Important — good speakers enhance the drive", score: "sedan" }, { label: "Moderate — I mostly listen to podcasts", score: "compact" }, { label: "Not important — I prefer the silence of EV", score: "offroad" }] },
    { id: 48, text: "What is your preferred vehicle drive type?", options: [{ label: "Front-wheel drive — efficient and predictable", score: "compact" }, { label: "Rear-wheel drive — sporty dynamics", score: "sport" }, { label: "All-wheel drive — confidence in all conditions", score: "suv" }, { label: "Dual motor — maximum performance", score: "sedan" }] },
    { id: 49, text: "How do you feel about electric vehicle battery recycling?", options: [{ label: "Very important — sustainability matters", score: "compact" }, { label: "Important — but I trust manufacturers", score: "sedan" }, { label: "Not something I think about", score: "suv" }, { label: "Critical — I research before buying", score: "mpv" }] },
    { id: 50, text: "What would make you choose BYD over Tesla?", options: [{ label: "Better value for money", score: "compact" }, { label: "Superior battery safety (Blade Battery)", score: "suv" }, { label: "More model variety and options", score: "sedan" }, { label: "Better build quality and interior", score: "mpv" }] },
    { id: 51, text: "How important is a 360-degree camera system?", options: [{ label: "Essential — I need full visibility", score: "mpv" }, { label: "Very useful for parking", score: "compact" }, { label: "Nice to have — but mirrors work fine", score: "offroad" }, { label: "Critical for my driving conditions", score: "suv" }] },
    { id: 52, text: "What is your preferred interior material?", options: [{ label: "Premium leather — luxury feel", score: "mpv" }, { label: "Sporty Alcantara — racing inspired", score: "sport" }, { label: "Sustainable vegan — eco-friendly", score: "compact" }, { label: "Durable cloth — practical and comfortable", score: "sedan" }] },
  ];

  const handleSelectOption = (qId: number, score: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: score }));
    if (currentStep < quizQuestions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const calculateResult = () => {
    const scoreCounts: Record<string, number> = {};
    Object.values(answers).forEach((score) => {
      const scoreStr = score as string;
      scoreCounts[scoreStr] = (scoreCounts[scoreStr] || 0) + 1;
    });

    let bestScore = "suv";
    let maxCount = 0;
    Object.entries(scoreCounts).forEach(([score, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        bestScore = score;
      }
    });

    // Map high level score to matching luxury models
    if (bestScore === "compact") return "BYD Dolphin";
    if (bestScore === "sport") return "BYD Yangwang U9";
    if (bestScore === "offroad") return "BYD Yangwang U8";
    if (bestScore === "mpv") return "BYD Denza D9";
    if (bestScore === "sedan") return "BYD Seal";
    return "BYD Atto 3"; // default robust crossover
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    const resolvedCar = calculateResult();
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ carModel: resolvedCar }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setRecommendedModel(resolvedCar);
        setPointsEarned(resJson.points_earned);
        onQuizSuccess(resJson.new_points);
      } else {
        alert(resJson.error || "Quiz entry failed.");
      }
    } catch {
      alert("Unable to reach lifestyle recommendation database nodes.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
    setRecommendedModel(null);
    setPointsEarned(null);
  };

  const progressPct = Math.round((currentStep / quizQuestions.length) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 text-left" id="byd-personality-quiz">
      <div className="flex justify-between items-center pb-3 border-b border-slate-800">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block">
            FLEET FIT SYSTEM
          </span>
          <h3 className="font-display font-semibold text-xs sm:text-sm text-slate-200 mt-0.5">
            Lifestyle Matchmaker Quiz
          </h3>
        </div>
        <HelpCircle className="w-4 h-4 text-cyan-400 animate-pulse" />
      </div>

      {recommendedModel ? (
        /* Result screen */
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-400 flex-shrink-0 animate-bounce" />
            <p className="text-xs font-mono text-emerald-300">
              QUIZ COMPLETE! Received <span className="font-bold text-white uppercase font-sans">+{pointsEarned} points</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-950">
              <CarImage model={recommendedModel} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-mono tracking-widest font-bold text-cyan-400">
                YOUR PERFECT MATCH Recommendation:
              </span>
              <h4 className="text-base font-bold font-sans tracking-tight text-white">{recommendedModel}</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Our advanced e-Platform selection engine analyzed your speed, capacity, and terrain preferences to allocate this flagship {recommendedModel} reference build path.
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Retake Matchmaker Quiz
          </button>
        </div>
      ) : (
        /* Question screen */
        <div className="space-y-4 font-sans">
          {/* Progress bar line */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline text-[9px] font-mono uppercase text-slate-500 leading-none">
              <span>Question {currentStep + 1} of {quizQuestions.length}</span>
              <span>{progressPct}% Done</span>
            </div>
            <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPct}%` }}
                className="h-full bg-cyan-400 transition-all duration-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200">
              {quizQuestions[currentStep].text}
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {quizQuestions[currentStep].options.map((opt, idx) => {
                const isSelected = answers[quizQuestions[currentStep].id] === opt.score;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(quizQuestions[currentStep].id, opt.score)}
                    className={`p-3 text-left text-xs rounded-xl border transition duration-150 flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-400 text-cyan-400 font-bold"
                        : "bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-300 hover:text-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit button on final question */}
          {Object.keys(answers).length === quizQuestions.length && (
            <button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>Settle Quiz & Claim Points</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
