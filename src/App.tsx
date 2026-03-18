import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  Target, 
  Lightbulb, 
  DollarSign, 
  Clock, 
  User, 
  ChevronRight,
  Sparkles,
  Gift,
  MessageSquare,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface Recommendation {
  title: string;
  reason: string;
  projections: { month: string; revenue: number }[];
}

interface AnalysisResult {
  theme: string;
  recommendations: Recommendation[];
}

// --- Constants ---

const QUESTIONS = [
  {
    id: 1,
    question: "하루에 부업에 투자할 수 있는 시간은 어느 정도인가요?",
    options: ["1시간 이내", "1~2시간", "2~4시간", "4시간 이상"]
  },
  {
    id: 2,
    question: "가장 선호하는 작업 방식은 무엇인가요?",
    options: ["컴퓨터/모바일 위주 (재택)", "몸으로 뛰는 활동적인 일", "창의적인 창작 활동 (글, 디자인)", "전문 지식 전달 (강의, 컨설팅)"]
  },
  {
    id: 3,
    question: "부업 시작을 위한 초기 자본금은 어느 정도인가요?",
    options: ["0원 (무자본 선호)", "10만원 이하", "100만원 이하", "제한 없음"]
  },
  {
    id: 4,
    question: "부업을 통해 얻고 싶은 월 목표 수익은?",
    options: ["30만원 이하 (소소한 용돈)", "30~100만원 (제2의 월급)", "100~300만원 (준전업)", "300만원 이상 (사업화)"]
  },
  {
    id: 5,
    question: "본인의 업무 성향은 어떤가요?",
    options: ["혼자 조용히 집중하는 일", "사람들과 소통하고 돕는 일", "결과가 바로 보이는 단순한 일", "장기적인 시스템을 구축하는 일"]
  },
  {
    id: 6,
    question: "새로운 기술이나 툴을 배우는 것에 대해 어떻게 생각하시나요?",
    options: ["매우 긍정적 (빨리 배우고 싶음)", "필요하다면 배울 의향 있음", "익숙한 기술을 활용하고 싶음", "배우는 것보다 바로 실행하는 게 좋음"]
  },
  {
    id: 7,
    question: "부업의 지속 가능성 중 가장 중요하게 생각하는 것은?",
    options: ["즉각적인 수익 발생", "시간 대비 높은 효율", "장기적인 커리어 성장", "자동화 수익 (패시브 인컴)"]
  }
];

const BENEFITS = [
  {
    title: "경험 기반 맞춤형 분석",
    description: "단순한 추천이 아닌, 당신의 실제 경험과 강점을 바탕으로 가장 성공 확률이 높은 부업을 선정해 드립니다."
  },
  {
    title: "구체적인 5-Step 실행 로드맵",
    description: "막막한 시작을 위해 무엇부터 어떻게 해야 할지 단계별로 명확한 가이드를 제공합니다."
  },
  {
    title: "최적의 수익 모델 제안",
    description: "가격을 얼마로 책정해야 할지, 어떤 방식으로 돈을 벌지 고민할 필요 없이 최적의 모델을 제안합니다."
  },
  {
    title: "실전 수익화 & 홍보 노하우",
    description: "단순한 이론이 아닌, 실제로 고객을 모으고 수익을 창출하는 실전 마케팅 전략을 전수합니다."
  },
  {
    title: "0원 홍보 전략 30가지",
    description: "마케팅 비용 한 푼 없이도 내 서비스를 알릴 수 있는 강력한 무료 홍보 채널과 방법을 공개합니다."
  },
  {
    title: "무자본 부업 리스트 10선",
    description: "리스크 없이 지금 바로 시작할 수 있는 검증된 무자본 부업 리스트를 추가로 제공합니다."
  }
];

// --- Components ---

export default function App() {
  const [step, setStep] = useState<'landing' | 'quiz' | 'experience' | 'loading' | 'result'>('landing');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [experiences, setExperiences] = useState<string[]>(['']);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => setStep('quiz');

  const handleAnswer = (option: string) => {
    const newAnswers = [...answers, option];
    setAnswers(newAnswers);
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setStep('experience');
    }
  };

  const handleExperienceChange = (index: number, value: string) => {
    const newExps = [...experiences];
    newExps[index] = value;
    setExperiences(newExps);
  };

  const addExperience = () => {
    if (experiences.length < 5) {
      setExperiences([...experiences, '']);
    }
  };

  const removeExperience = (index: number) => {
    if (experiences.length > 1) {
      setExperiences(experiences.filter((_, i) => i !== index));
    }
  };

  const generateAnalysis = async () => {
    setStep('loading');
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `
        사용자의 부업 성향 설문 결과와 경험을 바탕으로 최적의 부업 3가지를 추천해줘.
        
        [설문 결과]
        ${QUESTIONS.map((q, i) => `${q.question}: ${answers[i]}`).join('\n')}
        
        [사용자 경험]
        ${experiences.filter(e => e.trim()).map((e, i) => `${i + 1}. ${e}`).join('\n')}
        
        다음 JSON 형식으로 응답해줘:
        {
          "theme": "전체적인 부업 테마 (예: 지식 창업형, 활동가형 등)",
          "recommendations": [
            {
              "title": "부업 명칭",
              "reason": "선정 이유 (사용자의 경험과 설문 결과를 연결해서 구체적으로)",
              "projections": [
                {"month": "1개월", "revenue": 100000},
                {"month": "2개월", "revenue": 250000},
                {"month": "3개월", "revenue": 500000},
                {"month": "4개월", "revenue": 800000},
                {"month": "5개월", "revenue": 1200000},
                {"month": "6개월", "revenue": 1500000}
              ]
            }
          ]
        }
        추천 부업은 반드시 3개여야 하며, 예상 수익은 현실적으로 작성해줘.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text);
      setResult(data);
      setStep('result');
    } catch (err) {
      console.error(err);
      setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setStep('experience');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-orange-100">
      <AnimatePresence mode="wait">
        {step === 'landing' && (
          <motion.div 
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto px-6 py-20 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-600 font-semibold text-sm mb-8 border border-orange-100">
              <Sparkles className="w-4 h-4" />
              <span>나만의 맞춤형 N잡 찾기</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 md:mb-8 leading-[1.1]">
              당신의 경험은 <br />
              <span className="text-orange-500 italic">돈이 될 수 있습니다.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed">
              7가지 질문과 당신의 소중한 경험 5가지를 분석하여, 
              가장 확실하게 수익을 낼 수 있는 부업 로드맵을 설계해 드립니다.
            </p>
            <button 
              onClick={handleStart}
              className="group relative inline-flex items-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-[#1A1A1A] text-white rounded-2xl font-bold text-lg md:text-xl transition-all hover:bg-orange-500 hover:scale-105 active:scale-95 shadow-2xl shadow-black/10"
            >
              무료로 내 부업 성향 검사하기
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {[
                { icon: Target, title: "정밀한 분석", desc: "AI가 당신의 강점을 파악합니다" },
                { icon: BarChart3, title: "수익 시뮬레이션", desc: "예상 수익을 그래프로 확인하세요" },
                { icon: Lightbulb, title: "실전 노하우", desc: "바로 실행 가능한 전략 제공" }
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm">
                  <item.icon className="w-10 h-10 text-orange-500 mb-4" />
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'quiz' && (
          <motion.div 
            key="quiz"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto px-6 py-20"
          >
            <div className="mb-12">
              <div className="flex justify-between items-end mb-4">
                <span className="text-orange-500 font-bold text-sm uppercase tracking-widest">Question {currentQuestion + 1} / {QUESTIONS.length}</span>
                <span className="text-gray-300 font-mono text-xs">{Math.round(((currentQuestion + 1) / QUESTIONS.length) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-display font-bold mb-10 leading-tight">
              {QUESTIONS[currentQuestion].question}
            </h2>

            <div className="space-y-4">
              {QUESTIONS[currentQuestion].options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(option)}
                  className="w-full p-6 text-left rounded-2xl border-2 border-gray-100 hover:border-orange-500 hover:bg-orange-50 transition-all group flex items-center justify-between"
                >
                  <span className="text-lg font-medium text-gray-700 group-hover:text-orange-700">{option}</span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'experience' && (
          <motion.div 
            key="experience"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto px-6 py-20"
          >
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-4">마지막으로, 당신의 경험을 알려주세요</h2>
              <p className="text-gray-500">당신이 해왔던 일, 취미, 잘하는 것 등 사소한 것도 좋습니다. (최대 5개)</p>
            </div>

            <div className="space-y-4 mb-10">
              {experiences.map((exp, i) => (
                <div key={i} className="relative group">
                  <input
                    type="text"
                    value={exp}
                    onChange={(e) => handleExperienceChange(i, e.target.value)}
                    placeholder={`경험 ${i + 1} (예: 블로그 운영 1년, 엑셀 활용 능력 등)`}
                    className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-orange-500 focus:ring-0 outline-none transition-all"
                  />
                  {experiences.length > 1 && (
                    <button 
                      onClick={() => removeExperience(i)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              
              {experiences.length < 5 && (
                <button 
                  onClick={addExperience}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-all font-medium"
                >
                  + 경험 추가하기
                </button>
              )}
            </div>

            {error && <p className="text-red-500 mb-4 text-sm font-medium">{error}</p>}

            <button
              onClick={generateAnalysis}
              disabled={experiences.every(e => !e.trim())}
              className="w-full py-5 bg-[#1A1A1A] text-white rounded-2xl font-bold text-xl hover:bg-orange-500 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shadow-xl shadow-black/5"
            >
              분석 결과 확인하기
            </button>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto px-6 py-40 text-center"
          >
            <div className="relative w-24 h-24 mx-auto mb-12">
              <motion.div 
                className="absolute inset-0 border-4 border-orange-100 rounded-full"
              />
              <motion.div 
                className="absolute inset-0 border-4 border-t-orange-500 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <h2 className="text-3xl font-bold mb-4">당신에게 딱 맞는 부업을 찾고 있습니다</h2>
            <p className="text-gray-400 animate-pulse">AI가 경험과 성향을 정밀 분석 중입니다...</p>
          </motion.div>
        )}

        {step === 'result' && result && (
          <motion.div 
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-5xl mx-auto px-6 py-20"
          >
            <div className="mb-8 md:mb-12 text-center">
              <div className="inline-block px-4 py-1.5 rounded-full bg-orange-50 text-orange-600 font-bold text-xs uppercase tracking-widest mb-4">Analysis Complete</div>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold mb-4 md:mb-6">당신의 부업 테마는 <br /><span className="text-orange-500">[{result.theme}]</span> 입니다.</h2>
              <p className="text-gray-500 max-w-2xl mx-auto text-base md:text-lg">분석 결과를 바탕으로 가장 추천하는 3가지 부업과 예상 수익 로드맵입니다.</p>
            </div>

            <div className="grid grid-cols-1 gap-12 mb-24">
              {result.recommendations.map((rec, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-xl shadow-gray-200/50"
                >
                  <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-base md:text-lg shrink-0">0{i+1}</div>
                        <h3 className="text-2xl md:text-3xl font-bold">{rec.title}</h3>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-orange-500" /> 선정 이유
                          </h4>
                          <p className="text-gray-600 leading-relaxed text-base md:text-lg">{rec.reason}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-h-[250px] md:min-h-[300px]">
                      <h4 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" /> 6개월 예상 수익 추이
                      </h4>
                      <div className="w-full h-[200px] md:h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={rec.projections}>
                            <defs>
                              <linearGradient id={`colorRev-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis 
                              dataKey="month" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 12, fill: '#9ca3af'}}
                              dy={10}
                            />
                            <YAxis 
                              hide 
                            />
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => [`${value.toLocaleString()}원`, '예상 수익']}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="revenue" 
                              stroke="#f97316" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill={`url(#colorRev-${i})`} 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-between mt-4 text-xs font-bold text-gray-400">
                        <span>시작</span>
                        <span>6개월 뒤 목표: {rec.projections[5].revenue.toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="relative overflow-hidden bg-[#1A1A1A] rounded-[2rem] md:rounded-[3rem] p-8 md:p-20 text-white text-center">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500 rounded-full blur-[120px]" />
              </div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-orange-400 font-bold text-xs md:text-sm mb-6 md:mb-8">
                  <Gift className="w-4 h-4" />
                  <span>기간 한정 특별 할인 이벤트</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-7xl font-display font-bold mb-6 md:mb-8 leading-tight">
                  나만을 위한 <br />
                  <span className="text-orange-500">1:1 맞춤 상세 보고서</span> 받기
                </h2>
                <p className="text-lg md:text-xl text-gray-400 mb-10 md:mb-12 max-w-2xl mx-auto">
                  (10가지 무자본 부업 & 30가지 0원 홍보 방법 포함)
                </p>
                
                <div className="flex flex-col items-center gap-6 mb-12 md:mb-16">
                  <div className="flex items-center gap-4">
                    <span className="text-xl md:text-2xl text-gray-500 line-through">100,000원</span>
                    <span className="text-4xl md:text-5xl font-black text-white">30,000원</span>
                  </div>
                  <a 
                    href="https://www.postype.com/@ideaplan11/request/21812647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-3 px-8 md:px-12 py-4 md:py-6 bg-orange-500 text-white rounded-2xl font-bold text-xl md:text-2xl transition-all hover:bg-orange-600 hover:scale-105 active:scale-95 shadow-2xl shadow-orange-500/20"
                  >
                    지금 바로 보고서 신청하기
                    <ArrowRight className="w-6 h-6 md:w-7 md:h-7 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                  {BENEFITS.map((benefit, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-orange-500" /> {benefit.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{benefit.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-20 pt-20 border-t border-white/10">
                  <div className="inline-flex items-center gap-2 text-orange-500 font-bold mb-6">
                    <Sparkles className="w-5 h-5" />
                    <span>특별 혜택</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">🔥 후기 작성 시 '마케팅 비법서' 추가 증정!</h3>
                  <p className="text-gray-400 mb-10">후기를 작성해주시는 모든 분들께 추천드린 3개 부업에 대한 상세 가이드를 드립니다.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    {[
                      "1) 아이템 정밀 분석",
                      "2) 0원 홍보 전략 10가지",
                      "3) 7일 집중 실행 계획표"
                    ].map((item, i) => (
                      <div key={i} className="py-4 px-6 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div className="mt-20 text-center text-gray-400 text-sm">
              <p>© 2026 맞춤형 N잡 부업 검사기. All rights reserved.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
