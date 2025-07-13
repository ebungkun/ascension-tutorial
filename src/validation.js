import {
  GRADE_COLORS,
  GRADE_NAMES_KO,
  NORMAL_TUTORIAL_TARGET,
  SPECIAL_TUTORIAL_TARGET,
  MATERIAL_SOUL_A,
  MATERIAL_SOUL_B,
} from "./gameData";

const GRADE_ORDER = ['Epic', 'Epic+', 'Legendary', 'Legendary+', 'Eternal', 'Eternal+', 'Origin'];

const isGradeHigherOrEqual = (gradeA, gradeB) => {
    return GRADE_ORDER.indexOf(gradeA) >= GRADE_ORDER.indexOf(gradeB);
};

/**
 * 카드를 '승급 대상'으로 선택할 수 있는지 검사합니다.
 * @param {object} card - 선택된 카드
 * @param {array} inventory - 현재 인벤토리
 * @param {string} targetSoulName - 현재 튜토리얼의 목표 정령 이름
 * @param {string} tutorialType - 현재 튜토리얼 타입 ('일반' 또는 '특수')
 * @param {function} showToast - 토스트 메시지를 표시하는 함수
 * @returns {boolean} - 선택 가능하면 true, 아니면 false
 */
export function validateTargetSelection(card, inventory, targetSoulName, tutorialType, showToast) {
    // 규칙 1: 재료용 태생 레어 정령은 승급 대상이 될 수 없음
    if (card.baseGrade === 'Rare') {
        showToast('warning', `이 튜토리얼의 목표는 '${targetSoulName}' 승급입니다.`);
        return false;
    }

    // 규칙 2: 이미 더 높은 등급의 목표 정령이 있다면 중복 생성을 막음
    if (card.name === targetSoulName) {
        const hasLegendaryOrHigher = inventory.some(
            invCard => invCard.name === targetSoulName && isGradeHigherOrEqual(invCard.grade, 'Legendary')
        );

        if (hasLegendaryOrHigher) {
            if (tutorialType === '일반' && card.grade === 'Epic+') {
                showToast('error', `이미 레전더리 등급 이상의 ${targetSoulName}를 보유 중입니다!`);
                return false;
            }
            if (tutorialType === '특수' && card.grade === 'Epic+') {
                showToast('error', `실수! ${targetSoulName}는 레전더리 등급을 2개 만들면 안됩니다.`);
                return false;
            }
        }
    }

    return true; // 모든 검사를 통과
}

/**
 * 카드를 '재료'로 사용할 수 있는지 검사합니다.
 * @param {object} materialCard - 재료로 선택된 카드
 * @param {object} mainSlot - 승급 대상 슬롯에 있는 카드
 * @param {object} rule - 현재 적용되는 승급 규칙의 재료 조건
 * @param {string} tutorialType - 현재 튜토리얼 타입
 * @param {function} showToast - 토스트 메시지를 표시하는 함수
 * @param {function} showMessage - 팝업 메시지를 표시하는 함수
 * @returns {boolean} - 사용 가능하면 true, 아니면 false
 */
export function validateMaterialSelection(materialCard, mainSlot, rule, tutorialType, showToast, showMessage) {
    // 규칙 1: 일반 타입에서 '동일 타입' 재료로 태생 에픽을 사용하려 할 때 방지
    if (tutorialType === '일반' && rule.requirement === 'SAME_TYPE' && materialCard.baseGrade === 'Epic') {
        showMessage({ 
            title: "✋ 실수! 올바른 재료가 아닙니다", 
            content: [`태생 에픽 등급(${materialCard.name})은 귀합니다.`, `이 슬롯에는 '동일 타입'의 태생 레어 재료(예: ${MATERIAL_SOUL_A})를 사용해야 합니다.`], 
            confirmText: "확인" 
        });
        return false;
    }

    // 규칙 2: 등급과 타입/이름이 맞는지 확인
    const isGradeMatch = rule.grade === materialCard.grade;
    const isNameMatch = rule.requirement === 'SAME_CHARACTER' ? mainSlot.name === materialCard.name : true;
    
    if (!isGradeMatch || !isNameMatch) {
        const requiredName = rule.requirement === 'SAME_CHARACTER' ? mainSlot.name : '동일 타입';
        showToast('error', `잘못된 재료! '${GRADE_NAMES_KO[rule.grade]} ${requiredName}'가 필요합니다.`);
        return false;
    }

    return true; // 모든 검사를 통과
}

/**
 * 최종 '승급' 버튼을 누를 수 있는지 검사합니다.
 * @param {object} mainSlot - 승급 대상 슬롯에 있는 카드
 * @param {function} showMessage - 팝업 메시지를 표시하는 함수
 * @returns {boolean} - 승급 가능하면 true, 아니면 false
 */
export function validatePromotion(mainSlot, showMessage) {
    // 규칙 1: 태생 레어 정령의 최종 등급 초과 승급 방지
    if (mainSlot && mainSlot.baseGrade === 'Rare' && mainSlot.grade === 'Legendary+') {
        showMessage({ 
            title: "승급 불가", 
            content: [`'${mainSlot.name}'(은)는 태생 레어 정령으로, 레전더리+ 등급을 초과하여 승급할 수 없습니다.`], 
            confirmText: "확인" 
        });
        return false;
    }
    
    return true; // 모든 검사를 통과
}
