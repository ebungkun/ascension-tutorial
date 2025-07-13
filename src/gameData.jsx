// --- 튜토리얼 핵심 상수 ---
// 이 값들을 변경하면 튜토리얼의 대상과 재료 정령이 바뀝니다.
export const TARGET_SOUL_NAME = '이디스';
export const MATERIAL_SOUL_A_NAME = '르웨인';
export const MATERIAL_SOUL_B_NAME = '알리샤';


// --- 이미지 파일 불러오기 ---
// 실제 이미지를 사용하려면 주석을 해제하고 경로를 맞추세요.
import edithImage from './assets/edith.png';
import lewayneImage from './assets/lewayne.png';
import alishaImage from './assets/alisha.png';


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
  [TARGET_SOUL_NAME]: { img: edithImage, type: '요정형', baseGrade: 'Epic' },
  [MATERIAL_SOUL_A_NAME]: { img: lewayneImage, type: '요정형', baseGrade: 'Rare' },
  [MATERIAL_SOUL_B_NAME]: { img: alishaImage, type: '요정형', baseGrade: 'Rare' },
};

/**
 * 승급 규칙 정의
 * 키: '정령타입-현재등급'
 * requirement: 'SAME_CHARACTER'(동일 정령), 'SAME_TYPE'(동일 타입)
 */
export const PROMOTION_RULES = {
  '일반-Epic': {
    targetGrade: 'Epic+',
    materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic' }]
  },
  '일반-Epic+': {
    targetGrade: 'Legendary',
    materials: [
      { requirement: 'SAME_TYPE', grade: 'Epic+' },
      { requirement: 'SAME_TYPE', grade: 'Epic+' }
    ]
  },
  '일반-Legendary': {
    targetGrade: 'Legendary+',
    materials: [{ requirement: 'SAME_CHARACTER', grade: 'Epic+' }]
  },
  '일반-Legendary+': {
    targetGrade: 'Eternal',
    materials: [{ requirement: 'SAME_TYPE', grade: 'Legendary+' }]
  },
  '일반-Eternal': {
    targetGrade: 'Eternal+',
    materials: [{ requirement: 'SAME_TYPE', grade: 'Legendary+' }]
  },
  '일반-Eternal+': {
    targetGrade: 'Origin',
    materials: [
      { requirement: 'SAME_CHARACTER', grade: 'Epic+' },
      { requirement: 'SAME_CHARACTER', grade: 'Epic+' }
    ]
  },
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
    img: data.img,
  };
};
