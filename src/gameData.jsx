// --- 이미지 파일 불러오기 ---
import edithImage from './assets/edith.png';
import lewayneImage from './assets/lewayne.png';
import alishaImage from './assets/alisha.png';
import niaImage from './assets/nia.png'; 


// --- 등급 관련 상수 ---
export const GRADE_COLORS = {
  Rare: 'border-sky-400', 'Rare+': 'border-sky-400',
  Epic: 'border-purple-500', 'Epic+': 'border-purple-500',
  Legendary: 'border-yellow-400', 'Legendary+': 'border-yellow-400',
  Eternal: 'border-red-500', 'Eternal+': 'border-red-500',
  Origin: 'border-fuchsia-400',
};

export const GRADE_NAMES_KO = {
  Rare: '레어', 'Rare+': '레어+',
  Epic: '에픽', 'Epic+': '에픽+',
  Legendary: '레전더리', 'Legendary+': '레전더리+',
  Eternal: '이터널', 'Eternal+': '이터널+',
  Origin: '오리진',
};

// --- 캐릭터 데이터 정의 ---
export const CHARACTER_DATA = {
  '이디스': { img: edithImage, type: '요정형', baseGrade: 'Epic', promotionType: '일반' },
  '르웨인': { img: lewayneImage, type: '요정형', baseGrade: 'Rare', promotionType: '일반' },
  '알리샤': { img: alishaImage, type: '요정형', baseGrade: 'Rare', promotionType: '일반' },
  '니아': { img: niaImage, type: '악마형', baseGrade: 'Epic', promotionType: '특수' },
};

/**
 * 승급 규칙 정의
 * 키: '정령타입-현재등급'
 * requirement: 'SAME_CHARACTER'(동일 정령), 'SAME_TYPE'(동일 타입)
 */
export const PROMOTION_RULES = {
  // --- 일반 타입 규칙 ---
  '일반-Epic': { targetGrade: 'Epic+', materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic' }] },
  '일반-Epic+': { targetGrade: 'Legendary', materials: [{ requirement: 'SAME_TYPE', grade: 'Epic+' }, { requirement: 'SAME_TYPE', grade: 'Epic+' }] },
  '일반-Legendary': { targetGrade: 'Legendary+', materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic+' }] },
  '일반-Legendary+': { targetGrade: 'Eternal', materials: [{ requirement: 'SAME_TYPE', grade: 'Legendary+' }] },
  '일반-Eternal': { targetGrade: 'Eternal+', materials: [{ requirement: 'SAME_TYPE', grade: 'Legendary+' }] },
  '일반-Eternal+': { targetGrade: 'Origin', materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic+' }, { requirement: 'SAME_CHARACTER', grade: 'Epic+' }] },

  // --- 특수 타입 규칙 ---
  '특수-Epic': { targetGrade: 'Epic+', materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic' }] },
  '특수-Epic+': { targetGrade: 'Legendary', materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic+' }] },
  '특수-Legendary': { targetGrade: 'Legendary+', materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic+' }] },
  '특수-Legendary+': { targetGrade: 'Eternal', materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic+' }] },
  '특수-Eternal': { targetGrade: 'Eternal+', materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic+' }] },
  '특수-Eternal+': { targetGrade: 'Origin', materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic+' }, { requirement: 'SAME_CHARACTER', grade: 'Epic+' }] },
};

// --- 헬퍼 함수 ---

/**
 * 캐릭터 카드 객체를 생성합니다.
 */
export const createCard = (name, grade, idSuffix) => {
  const data = CHARACTER_DATA[name];
  if (!data) throw new Error(`${name}에 대한 캐릭터 데이터가 없습니다.`);

  const id = idSuffix ? `${name}-${grade}-${idSuffix}` : `${name}-${grade}-${Date.now()}-${Math.random()}`;
  return {
    id, name, grade,
    type: data.type,
    baseGrade: data.baseGrade,
    promotionType: data.promotionType,
    img: data.img,
  };
};
