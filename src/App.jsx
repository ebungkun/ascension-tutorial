import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { 
    GRADE_COLORS, 
    GRADE_NAMES_KO, 
    PROMOTION_RULES, 
    createCard,
    TARGET_SOUL_NAME,
    MATERIAL_SOUL_A_NAME,
    MATERIAL_SOUL_B_NAME,
} from './gameData';
import plusStar from './assets/plus_star.png';

// --- 상태 관리 (useReducer) ---

const initialState = {
  tutorialPhase: 'intro',
  inventory: [],
  mainSlot: null,
  materialSlots: [],
  // draggedItem, touchGhost 등 불필요한 상태 제거
  feedback: { type: 'info', text: '튜토리얼을 시작하려면 버튼을 눌러주세요.' },
  message: null,
  toast: null,
  newlyCreatedCard: null,
};

function tutorialReducer(state, action) {
  switch (action.type) {
    case 'START_CINEMATIC':
      return { ...state, tutorialPhase: 'cinematic', message: null };
    case 'START_MANUAL_PROMO':
      return {
        ...state,
        tutorialPhase: 'manual_promo',
        message: null,
        inventory: [
          ...Array(8).fill(0).map((_, i) => createCard(TARGET_SOUL_NAME, 'Epic', `epic-${i}`)),
          createCard(MATERIAL_SOUL_A_NAME, 'Epic+', 'ep1'),
          createCard(MATERIAL_SOUL_B_NAME, 'Epic+', 'ep2'),
          createCard(MATERIAL_SOUL_A_NAME, 'Legendary+', 'lp1'),
          createCard(MATERIAL_SOUL_B_NAME, 'Legendary+', 'lp2'),
        ],
        // 초기 안내 메시지 변경
        feedback: { type: 'info', text: `승급할 정령을 선택해 주세요.` }
      };
    
    // --- 드래그앤드롭 로직을 대체하는 새로운 'SELECT_CARD' 액션 ---
    case 'SELECT_CARD': {
        const selectedCard = action.payload;
        const { inventory, mainSlot, materialSlots, feedback } = state;

        // 이미 슬롯에 있는 카드는 선택 불가
        if ((mainSlot && mainSlot.id === selectedCard.id) || materialSlots.some(m => m && m.id === selectedCard.id)) {
            return state;
        }

        const newInventory = inventory.filter(c => c.id !== selectedCard.id);

        // 1. 승급 대상 선택 (mainSlot이 비어있을 때)
        if (!mainSlot) {
            const newMainSlot = selectedCard;
            const rule = PROMOTION_RULES[`일반-${newMainSlot.grade}`] || null;
            const newMaterialSlots = rule ? new Array(rule.materials.length).fill(null) : [];
            return {
                ...state,
                inventory: newInventory,
                mainSlot: newMainSlot,
                materialSlots: newMaterialSlots,
                feedback: { type: 'info', text: '좋습니다! 이제 규칙에 맞는 재료를 선택해주세요.' }
            };
        }

        // 2. 재료 선택 (mainSlot이 채워져 있을 때)
        const firstEmptySlotIndex = materialSlots.findIndex(slot => slot === null);
        if (firstEmptySlotIndex !== -1) {
            // 재료 유효성 검사 (validateMaterial 함수가 피드백을 처리)
            // 이 로직은 App 컴포넌트의 헬퍼 함수로 이동하여 재사용합니다.
            // 여기서는 유효성 검사가 통과되었다고 가정하고 상태를 업데이트합니다.
            const newMaterialSlots = [...materialSlots];
            newMaterialSlots[firstEmptySlotIndex] = selectedCard;
            
            const isNowFilled = newMaterialSlots.every(slot => slot !== null);

            return { 
                ...state, 
                inventory: newInventory, 
                materialSlots: newMaterialSlots,
                feedback: { 
                    type: 'info', 
                    text: isNowFilled ? '모든 재료가 준비되었습니다. 승급 버튼을 누르세요!' : '다음 재료를 선택해주세요.' 
                }
            };
        }
        
        // 재료 슬롯이 꽉 찼다면 아무것도 하지 않음
        return state;
    }

    case 'CONFIRM_NEW_CARD': {
        const { newlyCreatedCard, inventory } = state;
        if (newlyCreatedCard.grade === 'Origin') {
            return { ...state, tutorialPhase: 'finished', newlyCreatedCard: null };
        }
        const newInventory = [...inventory, newlyCreatedCard];
        const inventoryCount = (name, grade) => newInventory.filter(c => c.name === name && c.grade === grade).length;
        let feedbackText = `다음 승급을 계속 진행하세요.`;

        if (newlyCreatedCard.grade === 'Epic+') {
            if (inventoryCount(TARGET_SOUL_NAME, 'Epic+') < 4) {
                feedbackText = `잘하셨어요! 다음 에픽+ ${TARGET_SOUL_NAME}를 만들어보세요.`;
            } else {
                feedbackText = `좋아요! 이제 레전더리 등급에 도전해볼까요? 에픽+ ${TARGET_SOUL_NAME}를 승급 대상으로 올리세요.`;
            }
        } else if (newlyCreatedCard.grade === 'Legendary') {
            feedbackText = `레전더리 성공! 다음은 레전더리+ 입니다. 방금 만든 카드를 승급 대상으로 올리세요.`;
        } else if (newlyCreatedCard.grade === 'Legendary+') {
            if (inventoryCount(TARGET_SOUL_NAME, 'Legendary+') < 2) {
                feedbackText = `좋습니다! 다음 레전더리+ ${TARGET_SOUL_NAME}를 만들어 보세요.`;
            } else {
                feedbackText = `이터널 등급을 만들 차례입니다! 레전더리+ ${TARGET_SOUL_NAME}를 승급 대상으로 올리세요.`;
            }
        }
        return { ...state, inventory: newInventory, newlyCreatedCard: null, feedback: { type: 'info', text: feedbackText } };
    }
    case 'CLEAR_SLOTS': {
        const cardsToReturn = [];
        if (state.mainSlot) cardsToReturn.push(state.mainSlot);
        state.materialSlots.forEach(card => { if(card) cardsToReturn.push(card); });
        return { ...state, inventory: [...state.inventory, ...cardsToReturn], mainSlot: null, materialSlots: [], feedback: { type: 'info', text: '슬롯을 모두 비웠습니다. 승급할 정령을 선택하세요.' } };
    }
    case 'SET_FEEDBACK': return { ...state, feedback: action.payload };
    case 'SHOW_MESSAGE': return { ...state, message: action.payload };
    case 'HIDE_MESSAGE': return { ...state, message: null };
    case 'SHOW_TOAST': return { ...state, toast: action.payload };
    case 'HIDE_TOAST': return { ...state, toast: null };
    case 'ATTEMPT_PROMOTION': {
      const { mainSlot } = state;
      const { rule } = action.payload;
      const newCard = createCard(mainSlot.name, rule.targetGrade);
      return { ...state, mainSlot: null, materialSlots: [], newlyCreatedCard: newCard, feedback: { type: 'success', text: `훌륭해요! ${GRADE_NAMES_KO[newCard.grade]} ${newCard.name} 완성!` } };
    }
    // DROP_CARD, SET_DRAGGED_ITEM, CLEAR_DRAGGED_ITEM, UPDATE_MATERIAL_SLOTS 등 불필요한 액션 제거
    default: return state;
  }
}

// --- Components ---

const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-yellow-500';
    return createPortal(
        <div className={`fixed top-5 right-5 ${bgColor} text-white py-3 px-5 rounded-lg shadow-lg animate-toast-in`}>
            <p>{message}</p>
        </div>,
        document.body
    );
};

// isDragging, isGhost 등 불필요한 props 제거, onClick 추가
const CharacterCard = React.forwardRef(({ card, isNew, size = 'large', onClick, ...props }, ref) => {
  if (!card) return null;
  const borderColor = GRADE_COLORS[card.grade] || 'border-gray-400';
  const hasPlus = card.grade.includes('+');

  const sizeStyles = {
    large: { container: 'w-24 h-32', image: 'w-16 h-16', name: 'text-sm', grade: 'text-xs', star: 'w-8 h-8 -mt-3 -mr-3' },
    small: { container: 'w-20 h-28', image: 'w-12 h-12', name: 'text-xs', grade: 'text-[10px]', star: 'w-6 h-6 -mt-2 -mr-2' },
  };
  const styles = sizeStyles[size] || sizeStyles.large;
  
  // 클릭 가능한 카드에 대한 시각적 피드백 추가
  const clickableClasses = onClick ? 'cursor-pointer hover:scale-105 active:scale-100' : '';

  return (
    <div ref={ref}
      onClick={onClick}
      className={`relative ${styles.container} bg-gray-50 rounded-lg border-4 ${borderColor} shadow-md flex flex-col items-center justify-center p-1 transition-all duration-200 ${clickableClasses} ${isNew ? 'animate-new-card-pop' : ''}`} {...props}>
      <img src={card.img} alt={card.name} className={`${styles.image} rounded-md object-cover`} draggable="false" />
      <p className={`text-gray-900 font-bold mt-1 truncate ${styles.name}`}>{card.name}</p>
      <p className={`text-gray-600 ${styles.grade}`}>{GRADE_NAMES_KO[card.grade] || card.grade}</p>
      {hasPlus && <div className={`absolute top-0 right-0 ${styles.star}`}><img src={plusStar} alt="Plus Star" className="w-full h-full drop-shadow-lg" /></div>}
      {isNew && <div className="absolute top-0 left-0 -mt-2 -ml-2 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 shadow-sm">NEW</div>}
    </div>
  );
});

// onDrop 등 불필요한 props 제거
const Slot = ({ card, children }) => (
  <div className="w-28 h-36 bg-gray-200/60 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400 transition-all duration-300">
    {/* 슬롯에 있는 카드는 클릭 불가 (단순 표시용) */}
    {card ? <CharacterCard card={card} /> : children}
  </div>
);

const MessageBox = ({ title, children, onConfirm, confirmText }) => createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-50 text-gray-900 rounded-xl shadow-2xl p-6 sm:p-8 max-w-lg w-full border animate-fade-in-up">
            <h2 className="text-2xl font-bold mb-4 text-purple-600">{title}</h2>
            <div className="space-y-3 text-gray-700">{children}</div>
            {onConfirm && <button onClick={onConfirm} className="mt-6 w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400">{confirmText}</button>}
        </div>
    </div>,
    document.body
);

const CinematicPhase = ({ onComplete }) => {
    // ... (CinematicPhase 컴포넌트는 변경 없음)
    const [step, setStep] = useState(0);
    const renderStep = () => {
        switch (step) {
            case 0: return (<MessageBox title="Phase 1: 재료 준비" onConfirm={() => setStep(1)} confirmText="네, 알겠습니다"><p>{TARGET_SOUL_NAME}를 승급시키려면 먼저 재료를 준비해야 합니다.</p><p>승급에 필요한 재료들이 어떻게 만들어지는지 간단히 살펴봅시다.</p></MessageBox>);
            case 1:
            case 2:
                const isFirstStep = step === 1;
                const fromCard = isFirstStep ? createCard(MATERIAL_SOUL_A_NAME, 'Rare') : createCard(MATERIAL_SOUL_A_NAME, 'Epic+');
                const toCard = isFirstStep ? createCard(MATERIAL_SOUL_A_NAME, 'Epic+') : createCard(MATERIAL_SOUL_A_NAME, 'Legendary+');
                const count = isFirstStep ? 18 : 4;
                const titleColor = toCard.grade === 'Legendary+' ? 'text-yellow-500' : 'text-purple-600';
                return (<div className="w-full animate-fade-in"><h3 className={`text-2xl font-bold text-center ${titleColor} mb-6`}>{GRADE_NAMES_KO[toCard.grade]} 재료 만들기</h3><div className="flex justify-center items-center gap-2 sm:gap-4 flex-wrap"><CharacterCard card={fromCard} /><p className="text-2xl sm:text-3xl font-bold text-gray-800 animate-fade-in" style={{animationDelay: '0.5s'}}>x {count}</p><p className={`text-3xl sm:text-5xl font-bold ${titleColor} animate-pulse mx-2 sm:mx-4`} style={{animationDelay: '1s'}}>=</p><div className="animate-new-card-pop" style={{animationDelay: '1.5s'}}><CharacterCard card={toCard} isNew={true} /></div></div></div>);
            case 3: return (<MessageBox title="재료 준비 완료" onConfirm={onComplete} confirmText={`${TARGET_SOUL_NAME} 승급 시작하기`}><p>오리진 {TARGET_SOUL_NAME}를 만들려면 다음 재료들이 필요합니다:</p><ul className="list-disc list-inside my-2 text-left bg-gray-200 p-3 rounded-lg"><li><span className="font-bold text-yellow-600">레전더리+ 재료</span> x 2개 ({MATERIAL_SOUL_A_NAME}, {MATERIAL_SOUL_B_NAME} 등)</li><li><span className="font-bold text-purple-600">에픽+ 재료</span> x 2개 ({MATERIAL_SOUL_A_NAME}, {MATERIAL_SOUL_B_NAME} 등)</li></ul><p className="mt-2">이제 이 재료들을 사용해서, 실수를 피하며 {TARGET_SOUL_NAME}를 올바르게 승급시켜 봅시다.</p></MessageBox>);
            default: return null;
        }
    }
    useEffect(() => { if (step === 1 || step === 2) { const timer = setTimeout(() => { setStep(s => s + 1); }, 4000); return () => clearTimeout(timer); } }, [step]);
    return (<div className="fixed inset-0 bg-gray-200/95 backdrop-blur-sm z-40 flex items-center justify-center p-4">{renderStep()}</div>);
};

// --- Main App Component ---
export default function App() {
  const [state, dispatch] = useReducer(tutorialReducer, initialState);
  const { tutorialPhase, inventory, mainSlot, materialSlots, feedback, message, toast, newlyCreatedCard } = state;
  // touchGhost, touchOffset 등 불필요한 상태 및 ref 제거

  const currentPromotionRule = useMemo(() => {
    if (!mainSlot) return null;
    const ruleKey = `일반-${mainSlot.grade}`; 
    return PROMOTION_RULES[ruleKey] || null;
  }, [mainSlot]);

  // 재료 유효성 검사 헬퍼 함수
  const validateMaterial = (card, rule) => {
    if (rule.requirement === 'SAME_TYPE' && card.baseGrade === 'Epic') {
        dispatch({ type: 'SHOW_MESSAGE', payload: { title: "✋ 실수! 올바른 재료가 아닙니다", content: [`태생 에픽 등급(${card.name})은 매우 귀합니다.`, `이 슬롯에는 '동일 타입'의 일반 재료(예: ${MATERIAL_SOUL_A_NAME})를 사용해야 합니다.`], confirmText: "확인" }});
        return false;
    }
    const isGradeMatch = rule.grade === card.grade;
    const isNameMatch = rule.requirement === 'SAME_CHARACTER' ? mainSlot.name === card.name : true;
    if (!isGradeMatch || !isNameMatch) {
        const requiredName = rule.requirement === 'SAME_CHARACTER' ? mainSlot.name : '동일 타입';
        dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', message: `잘못된 재료! '${GRADE_NAMES_KO[rule.grade]} ${requiredName}'가 필요합니다.` } });
        return false;
    }
    return true;
  };

  // --- 새로운 클릭 핸들러 ---
  const handleCardClick = (card) => {
    if (!mainSlot) { // 승급 대상 선택
        dispatch({ type: 'SELECT_CARD', payload: card });
        return;
    }

    // 재료 선택
    const firstEmptySlotIndex = materialSlots.findIndex(slot => slot === null);
    if (firstEmptySlotIndex !== -1) {
        const rule = currentPromotionRule.materials[firstEmptySlotIndex];
        if (validateMaterial(card, rule)) {
            dispatch({ type: 'SELECT_CARD', payload: card });
        }
    } else {
        dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', message: '재료 슬롯이 모두 찼습니다.' } });
    }
  };


  const handlePromotion = () => {
    if (!currentPromotionRule || materialSlots.includes(null)) {
        dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', message: '재료가 부족합니다.' } });
        return;
    }
    // 최종 유효성 검사는 리듀서에서 이미 처리되었으므로 여기서는 생략 가능하나, 안전을 위해 유지
    const allMaterialsValid = materialSlots.every((card, i) => {
        const rule = currentPromotionRule.materials[i];
        return rule.grade === card.grade && (rule.requirement === 'SAME_CHARACTER' ? mainSlot.name === card.name : mainSlot.type === card.type);
    });

    if (allMaterialsValid) {
        dispatch({ type: 'ATTEMPT_PROMOTION', payload: { rule: currentPromotionRule } });
    } else {
        dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', message: '재료가 올바르지 않습니다. 규칙을 확인해주세요.' } });
    }
  };

  // --- 드래그앤드롭, 터치 관련 핸들러 모두 제거 ---

  const feedbackColor = { info: 'text-blue-600', success: 'text-green-600', warning: 'text-yellow-600', error: 'text-red-600' }[feedback.type];
  
  const renderContent = () => {
    switch (tutorialPhase) {
        case 'intro':
            return (<div className="bg-gray-200 text-gray-900 min-h-screen flex items-center justify-center"><MessageBox title="에버소울 승급 튜토리얼" onConfirm={() => dispatch({type: 'START_CINEMATIC'})} confirmText="튜토리얼 시작하기"><p>복잡한 정령 승급, 더 이상 실수하지 마세요!</p><p>이 튜토리얼을 통해 '{TARGET_SOUL_NAME}'를 '오리진' 등급까지 안전하게 승급시키는 방법을 배워봅니다.</p></MessageBox></div>);
        case 'cinematic':
            return <CinematicPhase onComplete={() => dispatch({ type: 'START_MANUAL_PROMO' })} />;
        case 'manual_promo':
        case 'finished':
            return (
                // 불필요한 최상위 이벤트 리스너 제거
                <div className="bg-gray-200 text-gray-900 min-h-screen font-sans p-4 flex flex-col items-center">
                  {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => dispatch({ type: 'HIDE_TOAST' })} />}
                  {message && <MessageBox title={message.title} onConfirm={() => dispatch({type: 'HIDE_MESSAGE'})} confirmText="확인">{message.content.map((text, i) => <p key={i}>{text}</p>)}</MessageBox>}
                  {newlyCreatedCard && <MessageBox title="✨ 정령 승급 성공! ✨" onConfirm={() => dispatch({type: 'CONFIRM_NEW_CARD'})} confirmText="확인"><div className="flex justify-center mt-4"><CharacterCard card={newlyCreatedCard} isNew={true} /></div></MessageBox>}
                  {tutorialPhase === 'finished' && (
                    <MessageBox title="🎉 축하합니다! 🎉" onConfirm={() => window.location.reload()} confirmText="튜토리얼 다시하기">
                        <p className="text-center">오리진 등급 {TARGET_SOUL_NAME} 만들기에 완벽히 성공했습니다!</p>
                        <div className="flex justify-center my-4"><CharacterCard card={{...createCard(TARGET_SOUL_NAME, 'Origin'), id: 'final-soul'}} /></div>
                        <div className="bg-gray-200 p-3 rounded-lg text-sm space-y-3">
                            <div><p className="font-bold text-purple-600">✨ 핵심 전략</p><p className="mt-1 text-gray-700">'동일 타입 재료'가 필요할 때 '태생 레어' 정령({MATERIAL_SOUL_A_NAME}, {MATERIAL_SOUL_B_NAME})을 승급시켜 사용하면, 귀한 '태생 에픽' 정령({TARGET_SOUL_NAME})을 아낄 수 있습니다.</p></div>
                            <div><p className="font-bold text-purple-600">✨ 소모 재화</p><p className="mt-1 text-gray-700">오리진 {TARGET_SOUL_NAME}를 만들기까지 재료로 사용된 '태생 레어' 정령은 총 <span className="font-bold text-gray-900">180장</span>입니다. 레어 정령도 소중한 자원입니다!</p></div>
                        </div>
                    </MessageBox>
                  )}
                  {/* touchGhost 렌더링 제거 */}
                  
                  <div className="w-full max-w-4xl bg-gray-50 p-4 rounded-2xl shadow-lg border border-gray-300 mb-4">
                    <div className="flex flex-row items-center justify-center gap-1 sm:gap-4">
                      <div className="flex flex-col items-center"><p className="font-bold mb-2 text-sm md:text-base text-gray-800">승급 대상</p><Slot card={mainSlot} /></div>
                      <div className="text-2xl md:text-4xl font-black text-gray-400 mx-0 sm:mx-4 my-2 md:my-0">+</div>
                      <div className="flex flex-col items-center"><p className="font-bold mb-2 text-sm md:text-base text-gray-800">재료</p><div className="flex flex-row gap-2 flex-wrap justify-center">{materialSlots.length > 0 ? (materialSlots.map((card, i) => (<Slot key={i} card={card} />))) : <Slot><span className="text-gray-500 text-xs md:text-sm p-2 text-center">대상을 먼저 선택하세요</span></Slot>}</div></div>
                    </div>
                    <div className="mt-6 text-center">
                        {currentPromotionRule && <p className="text-purple-600 mb-4">다음 등급: <span className="font-bold">{GRADE_NAMES_KO[currentPromotionRule.targetGrade] || currentPromotionRule.targetGrade}</span></p>}
                        <div className="flex justify-center gap-4">
                            <button onClick={handlePromotion} disabled={!mainSlot || materialSlots.includes(null)} className="bg-purple-500 text-white font-bold py-2 px-4 md:py-3 md:px-8 rounded-lg shadow-md hover:bg-purple-600 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed">승급</button>
                            <button onClick={() => dispatch({type: 'CLEAR_SLOTS'})} className="bg-gray-500 text-white font-bold py-2 px-4 md:py-3 md:px-8 rounded-lg shadow-md hover:bg-gray-600 transition-all">비우기</button>
                        </div>
                        {feedback.text && <p className={`mt-4 font-semibold ${feedbackColor}`}>{feedback.text}</p>}
                    </div>
                  </div>
            
                  <div className="w-full max-w-5xl bg-gray-50 p-2 sm:p-4 md:p-6 rounded-2xl shadow-lg border border-gray-300 min-h-[200px]">
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center text-gray-800">보유 정령</h2>
                    {/* 초기 안내 메시지 추가 */}
                    {!mainSlot && inventory.length > 0 && <p className="text-center text-blue-600 mb-4 font-semibold animate-pulse">승급시킬 정령을 선택해 주세요.</p>}
                    
                    {inventory.length > 0 ? (
                        <div className="flex flex-wrap gap-2 sm:gap-4 justify-center">
                            {inventory.map(card => (
                                <CharacterCard 
                                    key={card.id} 
                                    card={card} 
                                    size="small" 
                                    onClick={() => handleCardClick(card)}
                                />
                            ))}
                        </div>
                    ) : ( 
                        <p className="text-center text-gray-600 pt-8">모든 정령을 사용했습니다!</p> 
                    )}
                  </div>
            
                  <style>{`
                    @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
                    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                    .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                    @keyframes new-card-pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-new-card-pop { animation: new-card-pop 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
                    @keyframes toast-in { 0% { transform: translateY(-100%); opacity: 0; } 10% { transform: translateY(0); opacity: 1; } 90% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-100%); opacity: 0; } }
                    .animate-toast-in { animation: toast-in 3s ease-out forwards; }
                  `}</style>
                </div>
            );
        default: return null;
    }
  }

  return renderContent();
}
