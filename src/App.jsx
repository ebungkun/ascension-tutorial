import React, { useState, useEffect, useMemo, useReducer, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    GRADE_COLORS, 
    GRADE_NAMES_KO, 
    PROMOTION_RULES, 
    createCard,
} from './gameData';
import plusStar from './assets/plus_star.png';

// --- 상태 관리 (useReducer) ---

const initialState = {
  tutorialPhase: 'type_selection',
  tutorialType: null,
  targetSoulName: null,
  inventory: [],
  mainSlot: null,
  materialSlots: [],
  feedback: { type: 'info', text: '튜토리얼 타입을 선택해주세요.' },
  message: null,
  toasts: [],
  newlyCreatedCard: null,
};

function tutorialReducer(state, action) {
  switch (action.type) {
    case 'RESET_TUTORIAL':
      return initialState;
    case 'SELECT_TUTORIAL_TYPE': {
        const { tutorialType, targetSoulName } = action.payload;
        if (tutorialType === '일반') {
            return { ...initialState, tutorialPhase: 'cinematic', tutorialType, targetSoulName };
        } else {
            return { ...initialState, tutorialPhase: 'special_intro', tutorialType, targetSoulName };
        }
    }
    case 'START_CINEMATIC':
      return { ...state, tutorialPhase: 'cinematic', message: null };
    case 'START_MANUAL_PROMO': {
      const { tutorialType, targetSoulName } = state;
      let initialInventory = [];
      if (tutorialType === '일반') {
        initialInventory = [
          ...Array(8).fill(0).map((_, i) => createCard(targetSoulName, 'Epic', `epic-${i}`)),
          createCard('르웨인', 'Epic+', 'ep1'),
          createCard('알리샤', 'Epic+', 'ep2'),
          createCard('르웨인', 'Legendary+', 'lp1'),
          createCard('알리샤', 'Legendary+', 'lp2'),
        ];
      } else { // 특수 타입
        initialInventory = Array(14).fill(0).map((_, i) => createCard(targetSoulName, 'Epic', `epic-${i}`));
      }
      return {
        ...state,
        tutorialPhase: 'manual_promo',
        inventory: initialInventory,
        feedback: { type: 'info', text: `승급할 정령을 선택해 주세요.` }
      };
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
            } else if (newlyCreatedCard.grade === 'Legendary') {
                feedbackText = `레전더리 성공! 다음은 레전더리+ 입니다. 방금 만든 카드를 승급 대상으로 올리세요.`;
            } else if (newlyCreatedCard.grade === 'Legendary+') {
                if (inventoryCount(targetSoulName, 'Legendary+') < 2) feedbackText = `좋습니다! 다음 레전더리+ ${targetSoulName}를 만들어 보세요.`;
                else feedbackText = `이터널 등급을 만들 차례입니다! 레전더리+ ${targetSoulName}를 승급 대상으로 올리세요.`;
            }
        }
        return { ...state, inventory: newInventory, newlyCreatedCard: null, feedback: { type: 'info', text: feedbackText } };
    }
    case 'EXECUTE_AUTO_PROMOTION': {
        let newInventory = [...state.inventory];
        const promotions = action.payload;
        promotions.forEach(promo => {
            const cardsToConsume = newInventory.filter(c => c.name === promo.name && c.grade === 'Epic').slice(0, promo.consumeCount);
            newInventory = newInventory.filter(c => !cardsToConsume.some(consumed => consumed.id === c.id));
            for (let i = 0; i < promo.createCount; i++) {
                newInventory.push(createCard(promo.name, 'Epic+', `auto-${i}`));
            }
        });
        return { ...state, inventory: newInventory, feedback: { type: 'success', text: '자동 승급이 완료되었습니다!' } };
    }
    case 'CLEAR_SLOTS': {
        const cardsToReturn = [];
        if (state.mainSlot) cardsToReturn.push(state.mainSlot);
        state.materialSlots.forEach(card => { if(card) cardsToReturn.push(card); });
        return { ...state, inventory: [...state.inventory, ...cardsToReturn], mainSlot: null, materialSlots: [], feedback: { type: 'info', text: '슬롯을 모두 비웠습니다. 승급할 정령을 선택하세요.' } };
    }
    case 'SHOW_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload].slice(-3) };
    case 'HIDE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload.id) };
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

const Toast = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => { onDismiss(); }, 3000);
        return () => { clearTimeout(timer); };
    }, [toast, onDismiss]);
    const bgColor = toast.type === 'error' ? 'bg-red-500' : 'bg-yellow-500';
    return (<div className={`${bgColor} text-white py-3 px-5 rounded-lg shadow-lg animate-toast-in`}><p>{toast.message}</p></div>);
};

const ToastContainer = ({ toasts, onDismiss }) => {
    return createPortal(<div className="fixed top-5 right-5 z-50 w-full max-w-sm space-y-2">{toasts.map(toast => (<Toast key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />))}</div>, document.body);
};

const CharacterCard = React.forwardRef(({ card, isNew, size = 'large', onClick, ...props }, ref) => {
  if (!card) return null;
  const borderColor = GRADE_COLORS[card.grade] || 'border-gray-400';
  const hasPlus = card.grade.includes('+');
  const sizeStyles = {
    large: { container: 'w-24 h-32 sm:w-28 sm:h-36', image: 'w-16 h-16 sm:w-20 sm:h-20', name: 'text-sm', grade: 'text-xs', star: 'w-8 h-8 -mt-3 -mr-3' },
    medium: { container: 'w-20 h-28 sm:w-24 sm:h-32', image: 'w-12 h-12 sm:w-16 sm:h-16', name: 'text-xs sm:text-sm', grade: 'text-[10px] sm:text-xs', star: 'w-6 h-6 -mt-2 -mr-2' },
    small: { container: 'w-20 h-28', image: 'w-12 h-12', name: 'text-xs', grade: 'text-[10px]', star: 'w-5 h-5 -mt-1.5 -mr-1.5' },
  };
  const styles = sizeStyles[size] || sizeStyles.large;
  const clickableClasses = onClick ? 'cursor-pointer hover:scale-105 active:scale-100' : '';
  return (<div ref={ref} onClick={onClick} className={`relative ${styles.container} bg-gray-50 rounded-lg border-4 ${borderColor} shadow-md flex flex-col items-center justify-center p-1 transition-all duration-200 ${clickableClasses} ${isNew ? 'animate-new-card-pop' : ''}`} {...props}><img src={card.img} alt={card.name} className={`${styles.image} rounded-md object-cover`} draggable="false" /><p className={`text-gray-900 font-bold mt-1 truncate ${styles.name}`}>{card.name}</p><p className={`text-gray-600 ${styles.grade}`}>{GRADE_NAMES_KO[card.grade] || card.grade}</p>{hasPlus && <div className={`absolute top-0 right-0 ${styles.star}`}><img src={plusStar} alt="Plus Star" className="w-full h-full drop-shadow-lg" /></div>}{isNew && <div className="absolute top-0 left-0 -mt-2 -ml-2 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 shadow-sm">NEW</div>}</div>);
});

const Slot = ({ card, children }) => (<div className="w-20 h-28 sm:w-28 sm:h-36 bg-gray-200/60 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400 transition-all duration-300">{card ? <CharacterCard card={card} size={card ? "small" : "medium"} /> : children}</div>);

const MessageBox = ({ title, children, onConfirm, confirmText }) => createPortal(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-gray-50 text-gray-900 rounded-xl shadow-2xl p-6 sm:p-8 max-w-lg w-full border animate-fade-in-up"><h2 className="text-2xl font-bold mb-4 text-purple-600 text-center">{title}</h2><div className="space-y-3 text-gray-700">{children}</div>{onConfirm && <button onClick={onConfirm} className="mt-6 w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400">{confirmText}</button>}</div></div>, document.body);

const CinematicPhase = ({ onComplete }) => {
    const MaterialPrepExample = ({ from, to, count, titleColor }) => (
        <div>
            <h3 className={`text-xl font-bold text-center ${titleColor} mb-4`}>{GRADE_NAMES_KO[to.grade]} 재료 만들기</h3>
            <div className="flex justify-center items-center gap-2 sm:gap-4 flex-wrap">
                <CharacterCard card={from} />
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">x {count}</p>
                <p className={`text-3xl sm:text-5xl font-bold ${titleColor} mx-2 sm:mx-4`}>=</p>
                <CharacterCard card={to} isNew={true} />
            </div>
        </div>
    );

    return (
        <MessageBox title="재료 준비" onConfirm={onComplete} confirmText="네, 알겠습니다">
            <div className="space-y-8">
                <MaterialPrepExample 
                    from={createCard('르웨인', 'Rare')}
                    to={createCard('르웨인', 'Epic+')}
                    count={18}
                    titleColor="text-purple-600"
                />
                <MaterialPrepExample 
                    from={createCard('르웨인', 'Epic+')}
                    to={createCard('르웨인', 'Legendary+')}
                    count={4}
                    titleColor="text-yellow-400"
                />
            </div>
             <p className="mt-6 text-center text-sm text-gray-600">일반 타입 정령을 승급시키려면, 이렇게 태생 레어 정령을 재료로 미리 만들어두는 것이 중요합니다.</p>
        </MessageBox>
    );
};

const SpecialIntroPhase = ({ onComplete }) => {
    return (
        <MessageBox title="특수 타입 승급 규칙" onConfirm={onComplete} confirmText="네, 알겠습니다">
            <p className="text-center">천사, 악마, 혼돈 타입 정령의 승급은 일반 타입보다 간단합니다.</p>
            <p className="mt-4 p-4 bg-indigo-100 text-indigo-800 rounded-lg text-center font-semibold">
                별도의 재료 없이, 오직 승급 대상과 똑같은 정령만을 재료로 사용합니다.
            </p>
        </MessageBox>
    );
};

const TutorialSelection = ({ onSelect }) => {
    return (<MessageBox title="에버소울 승급 튜토리얼" confirmText={null}><p className="text-center mb-4">어떤 타입의 정령 승급을 체험하시겠습니까?</p><div className="flex flex-col sm:flex-row gap-4"><button onClick={() => onSelect('일반', '이디스')} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-4 rounded-lg transition-colors duration-300"><p className="font-bold text-lg">일반 타입 (이디스)</p><p className="text-sm mt-1">(인간, 야수, 요정, 불사)</p></button><button onClick={() => onSelect('특수', '니아')} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 px-4 rounded-lg transition-colors duration-300"><p className="font-bold text-lg">특수 타입 (니아)</p><p className="text-sm mt-1">(천사, 악마, 혼돈)</p></button></div></MessageBox>);
};

const AutoPromotionModal = ({ possiblePromotions, onConfirm, onClose }) => {
    return (
        <MessageBox title="자동 승급 (에픽 → 에픽+)" onConfirm={() => onConfirm(possiblePromotions)} confirmText="승급">
            <p className="text-center text-sm text-gray-600 mb-2">아래 정령들을 에픽+ 등급으로 일괄 승급합니다.</p>
            <p className="text-center text-sm text-blue-600 font-semibold mb-4">자동 승급은 안전하므로 안심하세요!</p>
            <div className="space-y-4 max-h-60 overflow-y-auto p-2 bg-gray-100 rounded-lg">
                {possiblePromotions.map(promo => (
                    <div key={promo.name} className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm">
                        <div className="flex items-center gap-2">
                            <CharacterCard card={createCard(promo.name, 'Epic')} size="small" />
                            <span className="font-bold">x {promo.consumeCount}</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-500 mx-2">→</div>
                        <div className="flex items-center gap-2">
                            <CharacterCard card={createCard(promo.name, 'Epic+')} size="small" />
                            <span className="font-bold">x {promo.createCount}</span>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={onClose} className="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300">닫기</button>
        </MessageBox>
    );
};


// --- Main App Component ---
const GRADE_ORDER = ['Epic', 'Epic+', 'Legendary', 'Legendary+', 'Eternal', 'Eternal+', 'Origin'];

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
    return Object.entries(groupedByName)
        .filter(([name, count]) => count >= 2)
        .map(([name, count]) => ({
            name,
            consumeCount: Math.floor(count / 2) * 2,
            createCount: Math.floor(count / 2),
        }));
  }, [inventory]);

  // '자동 승급' 버튼 하이라이트 여부를 결정하는 useEffect
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

  const showToast = (type, message) => {
    dispatch({ type: 'SHOW_TOAST', payload: { id: Date.now(), type, message } });
  };

  const handleHideToast = useCallback((id) => {
    dispatch({ type: 'HIDE_TOAST', payload: { id } });
  }, []);

  const isGradeHigherOrEqual = (gradeA, gradeB) => {
    return GRADE_ORDER.indexOf(gradeA) >= GRADE_ORDER.indexOf(gradeB);
  };

  const validateMaterial = (card, rule) => {
    if (tutorialType === '일반' && rule.requirement === 'SAME_TYPE' && card.baseGrade === 'Epic') {
        dispatch({ type: 'SHOW_MESSAGE', payload: { title: "✋ 실수! 올바른 재료가 아닙니다", content: [`태생 에픽 등급(${card.name})은 매우 귀합니다.`, `이 슬롯에는 '동일 타입'의 일반 재료(예: 르웨인)를 사용해야 합니다.`], confirmText: "확인" }});
        return false;
    }
    const isGradeMatch = rule.grade === card.grade;
    const isNameMatch = rule.requirement === 'SAME_CHARACTER' ? mainSlot.name === card.name : true;
    if (!isGradeMatch || !isNameMatch) {
        const requiredName = rule.requirement === 'SAME_CHARACTER' ? mainSlot.name : '동일 타입';
        showToast('error', `잘못된 재료! '${GRADE_NAMES_KO[rule.grade]} ${requiredName}'가 필요합니다.`);
        return false;
    }
    return true;
  };

  const handleCardClick = (card) => {
    if (!mainSlot) {
        if (card.baseGrade === 'Rare') {
            showToast('warning', `이 튜토리얼의 목표는 '${targetSoulName}' 승급입니다.`);
            return;
        }
        if (card.name === targetSoulName) {
            const hasLegendaryOrHigher = inventory.some(invCard => invCard.name === targetSoulName && isGradeHigherOrEqual(invCard.grade, 'Legendary'));
            if (tutorialType === '일반' && card.grade === 'Epic+' && hasLegendaryOrHigher) {
                showToast('error', `이미 레전더리 등급 이상의 ${targetSoulName}를 보유 중입니다!`);
                return;
            }
            if (tutorialType === '특수' && card.grade === 'Epic+' && hasLegendaryOrHigher) {
                showToast('error', `실수! ${targetSoulName}는 레전더리 등급을 2개 만들면 안됩니다.`);
                return;
            }
        }
        dispatch({ type: 'SELECT_CARD', payload: card });
        return;
    }
    const firstEmptySlotIndex = materialSlots.findIndex(slot => slot === null);
    if (firstEmptySlotIndex !== -1) {
        const rule = currentPromotionRule.materials[firstEmptySlotIndex];
        if (validateMaterial(card, rule)) dispatch({ type: 'SELECT_CARD', payload: card });
    } else {
        showToast('error', '재료 슬롯이 모두 찼습니다.');
    }
  };

  const handlePromotion = () => {
    if (mainSlot && mainSlot.baseGrade === 'Rare' && mainSlot.grade === 'Legendary+') {
        dispatch({ type: 'SHOW_MESSAGE', payload: { title: "승급 불가", content: [`'${mainSlot.name}'(은)는 태생 레어 정령으로, 레전더리+ 등급을 초과하여 승급할 수 없습니다.`], confirmText: "확인" }});
        return;
    }
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
        case 'type_selection':
            return <TutorialSelection onSelect={(type, name) => dispatch({ type: 'SELECT_TUTORIAL_TYPE', payload: { tutorialType: type, targetSoulName: name } })} />;
        case 'special_intro':
            return <SpecialIntroPhase onComplete={() => dispatch({ type: 'START_MANUAL_PROMO' })} />;
        case 'cinematic':
            return <CinematicPhase onComplete={() => dispatch({ type: 'START_MANUAL_PROMO' })} />;
        case 'manual_promo':
        case 'finished':
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
                                <div><p className="font-bold text-purple-600">✨ 핵심 전략</p><p className="mt-1 text-gray-700">'동일 타입 재료'가 필요할 때 '태생 레어' 정령(르웨인, 알리샤)을 승급시켜 사용하면, 귀한 '태생 에픽' 정령({targetSoulName})을 아낄 수 있습니다.</p></div>
                                <div><p className="font-bold text-purple-600">✨ 소모 재화</p><p className="mt-1 text-gray-700">오리진 {targetSoulName}를 만들기까지 재료로 사용된 '태생 레어' 정령은 총 <span className="font-bold text-gray-900">180장</span>입니다. 레어 정령도 소중한 자원입니다!</p></div>
                            </div>
                        )}
                        {tutorialType === '특수' && (
                            <div className="mt-4 p-3 bg-teal-100 text-teal-800 rounded-lg text-sm">
                                <p className="font-bold text-center">✨ 다음 단계</p>
                                <p className="mt-2 text-center">천사/악마/혼돈 타입의 승급 방식은 간단합니다. 하지만 다른 타입의 정령들은 승급 방식이 더 까다로우므로, 이디스 튜토리얼도 꼭 체험해보세요!</p>
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
                        <button 
                            onClick={() => {
                                setIsAutoPromoModalOpen(true);
                                setShouldHighlightAutoPromo(false); // 클릭 시 애니메이션 중지
                            }} 
                            disabled={possiblePromotions.length === 0} 
                            className={`bg-blue-500 text-white font-bold py-2 px-3 rounded-lg shadow-md hover:bg-blue-600 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm relative
                                        ${shouldHighlightAutoPromo ? 'animate-pulse-button' : ''}`}
                        >
                            자동 승급
                        </button>
                    </div>
                    {!mainSlot && inventory.length > 0 && <p className="text-center text-blue-600 mb-4 font-semibold animate-pulse">승급시킬 정령을 선택해 주세요.</p>}
                    {inventory.length > 0 ? (<div className="flex flex-wrap gap-2 sm:gap-4 justify-center">{inventory.map(card => (<CharacterCard key={card.id} card={card} size="small" onClick={() => handleCardClick(card)} />))}</div>) : (<p className="text-center text-gray-600 pt-8">모든 정령을 사용했습니다!</p> )}
                  </div>
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
                    /* 자동 승급 버튼을 위한 맥박 애니메이션 */
                    @keyframes pulse-button {
                        50% {
                            transform: scale(1.05);
                            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);
                        }
                    }
                    .animate-pulse-button {
                        animation: pulse-button 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    }
                  `}</style>
                </div>
            );
        default: return null;
    }
  }

  return renderContent();
}
