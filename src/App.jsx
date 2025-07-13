import React, { useState, useEffect, useMemo, useReducer, useCallback } from 'react';
import { 
    GRADE_NAMES_KO, 
    PROMOTION_RULES, 
    createCard,
    NORMAL_TUTORIAL_TARGET,
} from './gameData';
import {
    ToastContainer, MessageBox, CinematicPhase, SpecialIntroPhase,
    TutorialSelection, AutoPromotionModal, CharacterCard, Slot,
} from './components';
import { 
    validateTargetSelection, 
    validateMaterialSelection, 
    validatePromotion 
} from './validation';

// --- 상태 관리 (useReducer) ---
const initialState = {
  tutorialPhase: 'type_selection', tutorialType: null, targetSoulName: null,
  inventory: [], mainSlot: null, materialSlots: [],
  feedback: { type: 'info', text: '튜토리얼 타입을 선택해주세요.' },
  message: null, toasts: [], newlyCreatedCard: null,
};

function tutorialReducer(state, action) {
  switch (action.type) {
    case 'RESET_TUTORIAL': return initialState;
    case 'SELECT_TUTORIAL_TYPE': {
        const { tutorialType, targetSoulName } = action.payload;
        if (tutorialType === '일반') return { ...initialState, tutorialPhase: 'cinematic', tutorialType, targetSoulName };
        else return { ...initialState, tutorialPhase: 'special_intro', tutorialType, targetSoulName };
    }
    case 'START_MANUAL_PROMO': {
      const { tutorialType, targetSoulName } = state;
      let initialInventory = [];
      if (tutorialType === '일반') {
        initialInventory = [
          ...Array(8).fill(0).map((_, i) => createCard(targetSoulName, 'Epic', `epic-${i}`)),
          createCard('르웨인', 'Epic+', 'ep1'), createCard('알리샤', 'Epic+', 'ep2'),
          createCard('르웨인', 'Legendary+', 'lp1'), createCard('알리샤', 'Legendary+', 'lp2'),
        ];
      } else {
        initialInventory = Array(14).fill(0).map((_, i) => createCard(targetSoulName, 'Epic', `epic-${i}`));
      }
      return { ...state, tutorialPhase: 'manual_promo', inventory: initialInventory, feedback: { type: 'info', text: `승급할 정령을 선택해 주세요.` } };
    }
    case 'SELECT_CARD': {
        const selectedCard = action.payload;
        const { inventory, mainSlot, materialSlots, tutorialType } = state;
        if ((mainSlot && mainSlot.id === selectedCard.id) || materialSlots.some(m => m && m.id === selectedCard.id)) return state;
        const newInventory = inventory.filter(c => c.id !== selectedCard.id);
        if (!mainSlot) {
            const newMainSlot = selectedCard;
            const rule = PROMOTION_RULES[`${tutorialType}-${newMainSlot.grade}`] || null;
            const newMaterialSlots = rule ? new Array(rule.materials.length).fill(null) : [];
            return { ...state, inventory: newInventory, mainSlot: newMainSlot, materialSlots: newMaterialSlots, feedback: { type: 'info', text: '좋습니다! 이제 규칙에 맞는 재료를 선택해주세요.' } };
        }
        const firstEmptySlotIndex = materialSlots.findIndex(slot => slot === null);
        if (firstEmptySlotIndex !== -1) {
            const newMaterialSlots = [...materialSlots];
            newMaterialSlots[firstEmptySlotIndex] = selectedCard;
            const isNowFilled = newMaterialSlots.every(slot => slot !== null);
            return { ...state, inventory: newInventory, materialSlots: newMaterialSlots, feedback: { type: 'info', text: isNowFilled ? '모든 재료가 준비되었습니다. 승급 버튼을 누르세요!' : '다음 재료를 선택해주세요.' } };
        }
        return state;
    }
    case 'CONFIRM_NEW_CARD': {
        const { newlyCreatedCard, inventory, targetSoulName } = state;
        if (newlyCreatedCard.grade === 'Origin') return { ...state, tutorialPhase: 'finished', newlyCreatedCard: null };
        const newInventory = [...inventory, newlyCreatedCard];
        const inventoryCount = (name, grade) => newInventory.filter(c => c.name === name && c.grade === grade).length;
        let feedbackText = `다음 승급을 계속 진행하세요.`;
        if (state.tutorialType === '일반') {
            if (newlyCreatedCard.grade === 'Epic+') {
                if (inventoryCount(targetSoulName, 'Epic+') < 4) feedbackText = `잘하셨어요! 다음 에픽+ ${targetSoulName}를 만들어보세요.`;
                else feedbackText = `좋아요! 이제 레전더리 등급에 도전해볼까요? 에픽+ ${targetSoulName}를 승급 대상으로 올리세요.`;
            } else if (newlyCreatedCard.grade === 'Legendary') feedbackText = `레전더리 성공! 다음은 레전더리+ 입니다. 방금 만든 카드를 승급 대상으로 올리세요.`;
            else if (newlyCreatedCard.grade === 'Legendary+') {
                if (inventoryCount(targetSoulName, 'Legendary+') < 2) feedbackText = `좋습니다! 다음 레전더리+ ${targetSoulName}를 만들어 보세요.`;
                else feedbackText = `이터널 등급을 만들 차례입니다! 레전더리+ ${targetSoulName}를 승급 대상으로 올리세요.`;
            }
        }
        return { ...state, inventory: newInventory, newlyCreatedCard: null, feedback: { type: 'info', text: feedbackText } };
    }
    case 'EXECUTE_AUTO_PROMOTION': {
        let newInventory = [...state.inventory];
        action.payload.forEach(promo => {
            const cardsToConsume = newInventory.filter(c => c.name === promo.name && c.grade === 'Epic').slice(0, promo.consumeCount);
            newInventory = newInventory.filter(c => !cardsToConsume.some(consumed => consumed.id === c.id));
            for (let i = 0; i < promo.createCount; i++) newInventory.push(createCard(promo.name, 'Epic+', `auto-${i}`));
        });
        return { ...state, inventory: newInventory, feedback: { type: 'success', text: '자동 승급이 완료되었습니다!' } };
    }
    case 'CLEAR_SLOTS': {
        const cardsToReturn = [];
        if (state.mainSlot) cardsToReturn.push(state.mainSlot);
        state.materialSlots.forEach(card => { if(card) cardsToReturn.push(card); });
        return { ...state, inventory: [...state.inventory, ...cardsToReturn], mainSlot: null, materialSlots: [], feedback: { type: 'info', text: '슬롯을 모두 비웠습니다. 승급할 정령을 선택하세요.' } };
    }
    case 'SHOW_TOAST': return { ...state, toasts: [...state.toasts, action.payload].slice(-3) };
    case 'HIDE_TOAST': return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload.id) };
    case 'SHOW_MESSAGE': return { ...state, message: action.payload };
    case 'HIDE_MESSAGE': return { ...state, message: null };
    case 'ATTEMPT_PROMOTION': {
      const { mainSlot } = state;
      const { rule } = action.payload;
      const newCard = createCard(mainSlot.name, rule.targetGrade);
      return { ...state, mainSlot: null, materialSlots: [], newlyCreatedCard: newCard, feedback: { type: 'success', text: `훌륭해요! ${GRADE_NAMES_KO[newCard.grade]} ${newCard.name} 완성!` } };
    }
    default: return state;
  }
}

// --- Main App Component ---
export default function App() {
  const [state, dispatch] = useReducer(tutorialReducer, initialState);
  const { tutorialPhase, tutorialType, targetSoulName, inventory, mainSlot, materialSlots, feedback, message, toasts, newlyCreatedCard } = state;
  const [isAutoPromoModalOpen, setIsAutoPromoModalOpen] = useState(false);
  const [shouldHighlightAutoPromo, setShouldHighlightAutoPromo] = useState(false);

  const possiblePromotions = useMemo(() => {
    const epicCards = inventory.filter(c => c.grade === 'Epic');
    const groupedByName = epicCards.reduce((acc, card) => {
        acc[card.name] = (acc[card.name] || 0) + 1;
        return acc;
    }, {});
    return Object.entries(groupedByName).filter(([, count]) => count >= 2).map(([name, count]) => ({ name, consumeCount: Math.floor(count / 2) * 2, createCount: Math.floor(count / 2) }));
  }, [inventory]);

  useEffect(() => {
    if (tutorialPhase === 'manual_promo' && possiblePromotions.length > 0) {
        setShouldHighlightAutoPromo(true);
    }
  }, [tutorialPhase, possiblePromotions]);

  const currentPromotionRule = useMemo(() => {
    if (!mainSlot) return null;
    const ruleKey = `${tutorialType}-${mainSlot.grade}`; 
    return PROMOTION_RULES[ruleKey] || null;
  }, [mainSlot, tutorialType]);

  const showToast = (type, message) => dispatch({ type: 'SHOW_TOAST', payload: { id: Date.now(), type, message } });
  const showMessage = (payload) => dispatch({ type: 'SHOW_MESSAGE', payload });
  const handleHideToast = useCallback((id) => dispatch({ type: 'HIDE_TOAST', payload: { id } }), []);

  const handleCardClick = (card) => {
    if (!mainSlot) {
        if (validateTargetSelection(card, inventory, targetSoulName, tutorialType, showToast)) {
            dispatch({ type: 'SELECT_CARD', payload: card });
        }
        return;
    }
    
    const firstEmptySlotIndex = materialSlots.findIndex(slot => slot === null);
    if (firstEmptySlotIndex !== -1) {
        const rule = currentPromotionRule.materials[firstEmptySlotIndex];
        if (validateMaterialSelection(card, mainSlot, rule, tutorialType, showToast, showMessage)) {
            dispatch({ type: 'SELECT_CARD', payload: card });
        }
    } else {
        showToast('error', '재료 슬롯이 모두 찼습니다.');
    }
  };

  const handlePromotion = () => {
    if (!validatePromotion(mainSlot, showMessage)) return;
    if (!currentPromotionRule || materialSlots.includes(null)) {
        showToast('error', '재료가 부족합니다.');
        return;
    }
    const allMaterialsValid = materialSlots.every((card, i) => {
        const rule = currentPromotionRule.materials[i];
        return rule.grade === card.grade && (rule.requirement === 'SAME_CHARACTER' ? mainSlot.name === card.name : mainSlot.type === card.type);
    });
    if (allMaterialsValid) dispatch({ type: 'ATTEMPT_PROMOTION', payload: { rule: currentPromotionRule } });
    else showToast('error', '재료가 올바르지 않습니다. 규칙을 확인해주세요.');
  };

  const feedbackColor = { info: 'text-blue-600', success: 'text-green-600', warning: 'text-yellow-600', error: 'text-red-600' }[feedback.type];
  
  const renderContent = () => {
    switch (tutorialPhase) {
        case 'type_selection': return <TutorialSelection onSelect={(type, name) => dispatch({ type: 'SELECT_TUTORIAL_TYPE', payload: { tutorialType: type, targetSoulName: name } })} />;
        case 'special_intro': return <SpecialIntroPhase onComplete={() => dispatch({ type: 'START_MANUAL_PROMO' })} />;
        case 'cinematic': return <CinematicPhase onComplete={() => dispatch({ type: 'START_MANUAL_PROMO' })} />;
        case 'manual_promo': case 'finished':
            return (
                <div className="bg-gray-200 text-gray-900 min-h-screen font-sans p-2 sm:p-4 flex flex-col items-center">
                  <ToastContainer toasts={toasts} onDismiss={handleHideToast} />
                  {message && <MessageBox title={message.title} onConfirm={() => dispatch({type: 'HIDE_MESSAGE'})} confirmText="확인">{Array.isArray(message.content) ? message.content.map((text, i) => <p key={i}>{text}</p>) : <p>{message.content}</p>}</MessageBox>}
                  {newlyCreatedCard && <MessageBox title="✨ 정령 승급 성공! ✨" onConfirm={() => dispatch({type: 'CONFIRM_NEW_CARD'})} confirmText="확인"><div className="flex justify-center mt-4"><CharacterCard card={newlyCreatedCard} isNew={true} /></div></MessageBox>}
                  {isAutoPromoModalOpen && <AutoPromotionModal possiblePromotions={possiblePromotions} onConfirm={(promos) => { dispatch({ type: 'EXECUTE_AUTO_PROMOTION', payload: promos }); setIsAutoPromoModalOpen(false); }} onClose={() => setIsAutoPromoModalOpen(false)} />}
                  {tutorialPhase === 'finished' && (
                    <MessageBox title="🎉 축하합니다! 🎉" onConfirm={() => dispatch({ type: 'RESET_TUTORIAL' })} confirmText="처음으로 돌아가기">
                        <p className="text-center">오리진 등급 {targetSoulName} 만들기에 완벽히 성공했습니다!</p>
                        <div className="flex justify-center my-4"><CharacterCard card={{...createCard(targetSoulName, 'Origin'), id: 'final-soul'}} /></div>
                        {tutorialType === '일반' && (
                            <div className="bg-gray-200 p-3 rounded-lg text-sm space-y-3">
                                <div><p className="font-bold text-purple-600">✨ 핵심 전략</p><p className="mt-1 text-gray-700">'동일 타입 재료'가 필요할 때 '태생 레어' 정령을 승급시켜 사용하면, 귀한 '태생 에픽' 정령({targetSoulName})을 아낄 수 있습니다.</p></div>
                                <div><p className="font-bold text-purple-600">✨ 소모 재화</p><p className="mt-1 text-gray-700">오리진 {targetSoulName}를 만들기까지 재료로 사용된 '태생 레어' 정령은 총 <span className="font-bold text-gray-900">180장</span>입니다. 레어 정령도 소중한 자원입니다!</p></div>
                            </div>
                        )}
                        {tutorialType === '특수' && (
                            <div className="mt-4 p-3 bg-teal-100 text-teal-800 rounded-lg text-sm">
                                <p className="font-bold text-center">✨ 다음 단계</p>
                                <p className="mt-2 text-center">천사/악마/혼돈 타입의 승급 방식은 간단합니다. 하지만 다른 타입의 정령들은 승급 방식이 더 까다로우므로, {NORMAL_TUTORIAL_TARGET} 튜토리얼도 꼭 체험해보세요!</p>
                            </div>
                        )}
                    </MessageBox>
                  )}
                  <div className="w-full max-w-4xl bg-gray-50 p-2 sm:p-4 rounded-2xl shadow-lg border border-gray-300 mb-4">
                    <div className="flex flex-row items-center justify-center gap-1 sm:gap-2">
                      <div className="flex flex-col items-center flex-shrink-0"><p className="font-bold mb-1 text-xs sm:text-base text-gray-800">승급 대상</p><Slot card={mainSlot} /></div>
                      <div className="text-xl sm:text-4xl font-black text-gray-400 self-center pt-6 px-1"> + </div>
                      <div className="flex flex-col items-center"><p className="font-bold mb-1 text-xs sm:text-base text-gray-800">재료</p><div className="flex flex-row gap-1 sm:gap-2 justify-center">{materialSlots.length > 0 ? (materialSlots.map((card, i) => (<Slot key={i} card={card} />))) : <Slot><span className="text-gray-500 text-[10px] sm:text-sm p-1 text-center">대상을 먼저 선택하세요</span></Slot>}</div></div>
                    </div>
                    <div className="mt-4 sm:mt-6 text-center">
                        {currentPromotionRule && <p className="text-purple-600 mb-2 sm:mb-4 text-sm sm:text-base">다음 등급: <span className="font-bold">{GRADE_NAMES_KO[currentPromotionRule.targetGrade] || currentPromotionRule.targetGrade}</span></p>}
                        <div className="flex justify-center gap-4">
                            <button onClick={handlePromotion} disabled={!mainSlot || materialSlots.includes(null)} className="bg-purple-500 text-white font-bold py-2 px-4 sm:py-3 sm:px-8 rounded-lg shadow-md hover:bg-purple-600 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base">승급</button>
                            <button onClick={() => dispatch({type: 'CLEAR_SLOTS'})} className="bg-gray-500 text-white font-bold py-2 px-4 sm:py-3 sm:px-8 rounded-lg shadow-md hover:bg-gray-600 transition-all text-sm sm:text-base">비우기</button>
                        </div>
                        {feedback.text && <p className={`mt-3 sm:mt-4 font-semibold text-sm sm:text-base ${feedbackColor}`}>{feedback.text}</p>}
                    </div>
                  </div>
                  <div className="w-full max-w-5xl bg-gray-50 p-2 sm:p-4 md:p-6 rounded-2xl shadow-lg border border-gray-300 min-h-[200px]">
                    <div className="flex justify-between items-center mb-3 sm:mb-4 px-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 flex-grow">보유 정령</h2>
                        <button onClick={() => { setIsAutoPromoModalOpen(true); setShouldHighlightAutoPromo(false); }} disabled={possiblePromotions.length === 0} className={`bg-blue-500 text-white font-bold py-2 px-3 rounded-lg shadow-md hover:bg-blue-600 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm relative ${shouldHighlightAutoPromo ? 'animate-pulse-button' : ''}`}>자동 승급</button>
                    </div>
                    {!mainSlot && inventory.length > 0 && <p className="text-center text-blue-600 mb-4 font-semibold animate-pulse">승급시킬 정령을 선택해 주세요.</p>}
                    {inventory.length > 0 ? (<div className="flex flex-wrap gap-2 sm:gap-4 justify-center">{inventory.map(card => (<CharacterCard key={card.id} card={card} size="small" onClick={() => handleCardClick(card)} />))}</div>) : (<p className="text-center text-gray-600 pt-8">모든 정령을 사용했습니다!</p> )}
                  </div>
                  
                  <footer className="text-center py-4 text-zinc-500 text-sm mt-10">
                    <p>제작자: 에붕소울 (아카라이브 에버소울 채널)</p>
                  </footer>

                  <style>{`
                    body, #root { word-break: keep-all; }
                    @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
                    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                    .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                    @keyframes new-card-pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-new-card-pop { animation: new-card-pop 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
                    @keyframes toast-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                    .animate-toast-in { animation: toast-in 0.5s ease-out forwards; }
                    @keyframes pulse-button { 50% { transform: scale(1.05); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4); } }
                    .animate-pulse-button { animation: pulse-button 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                  `}</style>
                </div>
            );
        default: return null;
    }
  }

  return renderContent();
}
