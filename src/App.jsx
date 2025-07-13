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
import plusStar from './assets/plus_star.png'; // 1. 별 모양 아이콘 이미지 임포트

// --- 상태 관리 (useReducer) ---

const initialState = {
  tutorialPhase: 'intro',
  inventory: [],
  mainSlot: null,
  materialSlots: [],
  draggedItem: null,
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
        feedback: { type: 'info', text: `먼저, 에픽 등급 ${TARGET_SOUL_NAME} 2장을 조합하여 에픽+ 등급을 만들어 보세요.` }
      };
    case 'DROP_CARD': {
      const { card, source, sourceIndex } = state.draggedItem;
      const { destination, destinationIndex } = action.payload;
      if (source === 'inventory' && destination === 'inventory') return state;
      let newInventory = [...state.inventory];
      let newMainSlot = state.mainSlot;
      let newMaterialSlots = [...state.materialSlots];
      if (source === 'inventory') newInventory = newInventory.filter(c => c.id !== card.id);
      else if (source === 'mainSlot') newMainSlot = null;
      else if (source === 'materialSlot') newMaterialSlots[sourceIndex] = null;
      if (destination === 'inventory') newInventory.push(card);
      else if (destination === 'mainSlot') {
        if (state.mainSlot) newInventory.push(state.mainSlot);
        newMainSlot = card;
      } else if (destination === 'materialSlot') {
        if (state.materialSlots[destinationIndex]) newInventory.push(state.materialSlots[destinationIndex]);
        newMaterialSlots[destinationIndex] = card;
      }
      return { ...state, inventory: newInventory, mainSlot: newMainSlot, materialSlots: newMaterialSlots };
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
    case 'SET_DRAGGED_ITEM': return { ...state, draggedItem: action.payload };
    case 'CLEAR_DRAGGED_ITEM': return { ...state, draggedItem: null };
    case 'SET_FEEDBACK': return { ...state, feedback: action.payload };
    case 'SHOW_MESSAGE': return { ...state, message: action.payload };
    case 'HIDE_MESSAGE': return { ...state, message: null };
    case 'SHOW_TOAST': return { ...state, toast: action.payload };
    case 'HIDE_TOAST': return { ...state, toast: null };
    case 'UPDATE_MATERIAL_SLOTS': return { ...state, materialSlots: action.payload.rule ? new Array(action.payload.rule.materials.length).fill(null) : [] };
    case 'ATTEMPT_PROMOTION': {
      const { mainSlot } = state;
      const { rule } = action.payload;
      const newCard = createCard(mainSlot.name, rule.targetGrade);
      return { ...state, mainSlot: null, materialSlots: [], newlyCreatedCard: newCard, feedback: { type: 'success', text: `훌륭해요! ${GRADE_NAMES_KO[newCard.grade]} ${newCard.name} 완성!` } };
    }
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

const CharacterCard = React.forwardRef(({ card, isDragging, isGhost, isNew, ...props }, ref) => {
  if (!card) return null;
  const borderColor = GRADE_COLORS[card.grade] || 'border-gray-400';
  const hasPlus = card.grade.includes('+');
  return (
    <div ref={ref} style={isGhost ? { position: 'fixed', pointerEvents: 'none', zIndex: 1000, transform: 'scale(1.1)', ...props.style } : {}}
      className={`relative w-24 h-32 bg-gray-50 rounded-lg border-4 ${borderColor} shadow-md flex flex-col items-center justify-center p-1 transition-all duration-200 ${isDragging ? 'opacity-30 scale-95' : 'opacity-100'} ${isNew ? 'animate-new-card-pop' : ''}`} {...props}>
      {/* 3. 이미지 자체의 드래그를 방지 */}
      <img src={card.img} alt={card.name} className="w-16 h-16 rounded-md object-cover" draggable="false" />
      <p className="text-gray-900 text-sm font-bold mt-1 truncate">{card.name}</p>
      <p className="text-gray-600 text-xs">{GRADE_NAMES_KO[card.grade] || card.grade}</p>
      {hasPlus && (
        <div className="absolute top-0 right-0 -mt-3 -mr-3">
          {/* 1. SVG를 이미지로 교체 */}
          <img src={plusStar} alt="Plus Star" className="w-8 h-8 drop-shadow-lg" />
        </div>
      )}
      {isNew && <div className="absolute top-0 left-0 -mt-2 -ml-2 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 shadow-sm">NEW</div>}
    </div>
  );
});

const Slot = ({ card, onDrop, onDragOver, onDragStart, onTouchStart, children }) => (
  <div onDrop={onDrop} onDragOver={onDragOver} className="w-28 h-36 bg-gray-200/60 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400 transition-all duration-300">
    {card ? <CharacterCard card={card} draggable="true" onDragStart={onDragStart} onTouchStart={onTouchStart} /> : children}
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
  const { tutorialPhase, inventory, mainSlot, materialSlots, draggedItem, feedback, message, toast, newlyCreatedCard } = state;
  const [touchGhost, setTouchGhost] = useState(null);

  const currentPromotionRule = useMemo(() => {
    if (!mainSlot) return null;
    const ruleKey = `일반-${mainSlot.grade}`; 
    return PROMOTION_RULES[ruleKey] || null;
  }, [mainSlot]);
  
  useEffect(() => {
    if (tutorialPhase === 'manual_promo') {
        dispatch({ type: 'UPDATE_MATERIAL_SLOTS', payload: { rule: currentPromotionRule } });
        if (mainSlot) {
            dispatch({ type: 'SET_FEEDBACK', payload: { type: 'info', text: '좋습니다! 이제 규칙에 맞는 재료를 슬롯에 올려주세요.' } });
        }
    }
  }, [mainSlot, currentPromotionRule, tutorialPhase]);

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

  const handleDropLogic = (destination, destinationIndex = null) => {
    if (!draggedItem) return;
    if (destination === 'materialSlot') {
        if (!currentPromotionRule) return;
        const materialRule = currentPromotionRule.materials[destinationIndex];
        if (!validateMaterial(draggedItem.card, materialRule)) return;
    }
    dispatch({ type: 'DROP_CARD', payload: { destination, destinationIndex } });
  };

  const handlePromotion = () => {
    if (!currentPromotionRule || materialSlots.includes(null)) {
        dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', message: '재료가 부족합니다.' } });
        return;
    }
    const allMaterialsValid = materialSlots.every((card, i) => {
        const rule = currentPromotionRule.materials[i];
        const isGradeMatch = rule.grade === card.grade;
        const isTypeMatch = rule.requirement === 'SAME_TYPE' ? mainSlot.type === card.type : true;
        const isNameMatch = rule.requirement === 'SAME_CHARACTER' ? mainSlot.name === card.name : true;
        return isGradeMatch && isTypeMatch && isNameMatch;
    });
    if (allMaterialsValid) dispatch({ type: 'ATTEMPT_PROMOTION', payload: { rule: currentPromotionRule } });
    else dispatch({ type: 'SHOW_TOAST', payload: { type: 'error', message: '재료가 올바르지 않습니다. 규칙을 확인해주세요.' } });
  };

  const handleDragStart = (e, card, source, sourceIndex = null) => { dispatch({ type: 'SET_DRAGGED_ITEM', payload: { card, source, sourceIndex } }); e.dataTransfer.effectAllowed = 'move'; };
  const handleTouchStart = (e, card, source, sourceIndex = null) => { if (e.cancelable) e.preventDefault(); const touch = e.touches[0]; dispatch({ type: 'SET_DRAGGED_ITEM', payload: { card, source, sourceIndex } }); setTouchGhost({ card, x: touch.clientX, y: touch.clientY }); };
  const handleTouchMove = (e) => { if (!draggedItem) return; const touch = e.touches[0]; setTouchGhost(prev => ({ ...prev, x: touch.clientX, y: touch.clientY })); };
  const handleDrop = (e, destination, destinationIndex = null) => { e.preventDefault(); handleDropLogic(destination, destinationIndex); dispatch({ type: 'CLEAR_DRAGGED_ITEM' }); };
  const handleTouchEnd = (e) => { if (!draggedItem) return; const touch = e.changedTouches[0]; setTouchGhost(null); const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY); const findSlot = (element) => { if (!element) return null; if (element.dataset.droptarget) return element.dataset; return findSlot(element.parentElement); }; const targetInfo = findSlot(dropTarget); if (targetInfo) { handleDropLogic(targetInfo.droptarget, targetInfo.index ? parseInt(targetInfo.index) : null); } dispatch({ type: 'CLEAR_DRAGGED_ITEM' }); };
  const handleDragOver = (e) => e.preventDefault();
  // 2. 드래그 종료 시 항상 상태를 초기화하는 핸들러 추가
  const handleGlobalDragEnd = () => {
    if (draggedItem) {
      dispatch({ type: 'CLEAR_DRAGGED_ITEM' });
    }
  };

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
                <div className="bg-gray-200 text-gray-900 min-h-screen font-sans p-4 sm:p-8 flex flex-col items-center" onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onDragEnd={handleGlobalDragEnd}>
                  {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => dispatch({ type: 'HIDE_TOAST' })} />}
                  {message && <MessageBox title={message.title} onConfirm={() => dispatch({type: 'HIDE_MESSAGE'})}>{message.content.map((text, i) => <p key={i}>{text}</p>)}</MessageBox>}
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
                  {touchGhost && <CharacterCard card={touchGhost.card} isGhost={true} style={{ left: `${touchGhost.x - 48}px`, top: `${touchGhost.y - 64}px` }} />}
                  
                  <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 text-purple-600">에버소울 승급 시뮬레이터</h1>
                  <p className="text-gray-600 text-center mb-8">목표: 에픽 {TARGET_SOUL_NAME}를 오리진 등급으로 만들기</p>
            
                  <div className="w-full max-w-4xl bg-gray-50 p-4 md:p-6 rounded-2xl shadow-lg border border-gray-300 mb-8">
                    <div className="flex flex-row items-center justify-center gap-1 sm:gap-4">
                      <div className="flex flex-col items-center"><p className="font-bold mb-2 text-sm md:text-base text-gray-800">승급 대상</p><div data-droptarget="mainSlot"><Slot card={mainSlot} onDrop={(e) => handleDrop(e, 'mainSlot')} onDragOver={handleDragOver} onDragStart={(e) => handleDragStart(e, mainSlot, 'mainSlot')} onTouchStart={(e) => handleTouchStart(e, mainSlot, 'mainSlot')} /></div></div>
                      <div className="text-2xl md:text-4xl font-black text-gray-400 mx-0 sm:mx-4 my-2 md:my-0">+</div>
                      <div className="flex flex-col items-center"><p className="font-bold mb-2 text-sm md:text-base text-gray-800">재료</p><div className="flex flex-row gap-2 flex-wrap justify-center">{materialSlots.length > 0 ? (materialSlots.map((card, i) => (<div key={i} data-droptarget="materialSlot" data-index={i}><Slot card={card} onDrop={(e) => handleDrop(e, 'materialSlot', i)} onDragOver={handleDragOver} onDragStart={(e) => handleDragStart(e, card, 'materialSlot', i)} onTouchStart={(e) => handleTouchStart(e, card, 'materialSlot', i)} /></div>))) : <Slot><span className="text-gray-500 text-xs md:text-sm p-2 text-center">대상을 먼저 선택하세요</span></Slot>}</div></div>
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
            
                  <div data-droptarget="inventory" className="w-full max-w-5xl bg-gray-50 p-4 md:p-6 rounded-2xl shadow-lg border border-gray-300 min-h-[200px]" onDrop={(e) => handleDrop(e, 'inventory')} onDragOver={handleDragOver}>
                    <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">보유 정령</h2>
                    {inventory.length > 0 ? (<div className="flex flex-wrap gap-2 md:gap-4 justify-center">{inventory.map(card => (<CharacterCard key={card.id} card={card} draggable="true" onDragStart={(e) => handleDragStart(e, card, 'inventory')} onTouchStart={(e) => handleTouchStart(e, card, 'inventory')} isDragging={draggedItem?.card.id === card.id} />))}</div>) : ( <p className="text-center text-gray-600 pt-8">모든 정령을 사용했습니다!</p> )}
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
