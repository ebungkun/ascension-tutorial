import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  GRADE_COLORS,
  GRADE_NAMES_KO,
  createCard,
  NORMAL_TUTORIAL_TARGET,
  SPECIAL_TUTORIAL_TARGET,
  MATERIAL_SOUL_A,
  MATERIAL_SOUL_B,
} from "./gameData";
import plusStar from "./assets/plus_star.png";

// --- Components ---

export const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => {
      clearTimeout(timer);
    };
  }, [toast, onDismiss]);
  const bgColor = toast.type === "error" ? "bg-red-500" : "bg-yellow-500";
  return (
    <div
      className={`${bgColor} text-white py-3 px-5 rounded-lg shadow-lg animate-toast-in`}
    >
      <p>{toast.message}</p>
    </div>
  );
};

export const ToastContainer = ({ toasts, onDismiss }) => {
  return createPortal(
    <div className="fixed top-5 right-5 z-50 w-full max-w-sm space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>,
    document.body
  );
};

export const CharacterCard = React.forwardRef(
  ({ card, isNew, size = "large", onClick, ...props }, ref) => {
    if (!card) return null;
    const borderColor = GRADE_COLORS[card.grade] || "border-gray-400";
    const hasPlus = card.grade.includes("+");
    const sizeStyles = {
      large: {
        container: "w-24 h-32 sm:w-28 sm:h-36",
        image: "w-16 h-16 sm:w-20 sm:h-20",
        name: "text-sm",
        grade: "text-xs",
        star: "w-8 h-8 -mt-3 -mr-3",
      },
      medium: {
        container: "w-20 h-28 sm:w-24 sm:h-32",
        image: "w-12 h-12 sm:w-16 sm:h-16",
        name: "text-xs sm:text-sm",
        grade: "text-[10px] sm:text-xs",
        star: "w-6 h-6 -mt-2 -mr-2",
      },
      small: {
        container: "w-20 h-28",
        image: "w-12 h-12",
        name: "text-xs",
        grade: "text-[10px]",
        star: "w-5 h-5 -mt-1.5 -mr-1.5",
      },
    };
    const styles = sizeStyles[size] || sizeStyles.large;
    const clickableClasses = onClick
      ? "cursor-pointer hover:scale-105 active:scale-100"
      : "";
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`relative ${
          styles.container
        } bg-gray-50 rounded-lg border-4 ${borderColor} shadow-md flex flex-col items-center justify-center p-1 transition-all duration-200 ${clickableClasses} ${
          isNew ? "animate-new-card-pop" : ""
        }`}
        {...props}
      >
        <img
          src={card.img}
          alt={card.name}
          className={`${styles.image} rounded-md object-cover`}
          draggable="false"
        />
        <p className={`text-gray-900 font-bold mt-1 truncate ${styles.name}`}>
          {card.name}
        </p>
        <p className={`text-gray-600 ${styles.grade}`}>
          {GRADE_NAMES_KO[card.grade] || card.grade}
        </p>
        {hasPlus && (
          <div className={`absolute top-0 right-0 ${styles.star}`}>
            <img
              src={plusStar}
              alt="Plus Star"
              className="w-full h-full drop-shadow-lg"
            />
          </div>
        )}
        {isNew && (
          <div className="absolute top-0 left-0 -mt-2 -ml-2 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 shadow-sm">
            NEW
          </div>
        )}
      </div>
    );
  }
);

export const Slot = ({ card, children }) => (
  <div className="w-20 h-28 sm:w-28 sm:h-36 bg-gray-200/60 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400 transition-all duration-300">
    {card ? (
      <CharacterCard card={card} size={card ? "small" : "medium"} />
    ) : (
      children
    )}
  </div>
);

export const MessageBox = ({ title, children, onConfirm, confirmText }) =>
  createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 text-gray-900 rounded-xl shadow-2xl p-6 sm:p-8 max-w-lg w-full border animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-4 text-gray-700 text-center">
          {title}
        </h2>
        <div className="space-y-3 text-gray-700">{children}</div>
        {onConfirm && (
          <button
            onClick={onConfirm}
            className="mt-6 w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            {confirmText}
          </button>
        )}
      </div>
    </div>,
    document.body
  );

export const CinematicPhase = ({ onComplete }) => {
  const MaterialPrepExample = ({ from, to, count, titleColor }) => (
    <div>
      <h3 className={`text-xl font-bold text-center ${titleColor} mb-4`}>
        {GRADE_NAMES_KO[to.grade]} 재료 만들기
      </h3>
      {/* [수정] flex-wrap 클래스를 제거하여 모바일에서 줄바꿈이 일어나지 않도록 수정했습니다.
        이제 요소들이 항상 한 줄에 표시됩니다.
      */}
      <div className="flex justify-center items-center gap-2 sm:gap-4">
        <CharacterCard card={from} />
        <p className="text-2xl sm:text-3xl font-bold text-gray-800">
          x {count}
        </p>
        <p
          className={`text-3xl sm:text-5xl font-bold ${titleColor} mx-2 sm:mx-4`}
        >
          =
        </p>
        <CharacterCard card={to} isNew={true} />
      </div>
    </div>
  );

  return (
    <MessageBox
      title="재료 준비"
      onConfirm={onComplete}
      confirmText="네, 알겠습니다"
    >
      <div className="space-y-8">
        <MaterialPrepExample
          from={createCard(MATERIAL_SOUL_A, "Rare")}
          to={createCard(MATERIAL_SOUL_A, "Epic+")}
          count={18}
          titleColor="text-purple-600"
        />
        <MaterialPrepExample
          from={createCard(MATERIAL_SOUL_A, "Epic+")}
          to={createCard(MATERIAL_SOUL_A, "Legendary+")}
          count={4}
          titleColor="text-yellow-400"
        />
      </div>
      <p className="mt-6 text-center text-sm text-gray-600">
        {NORMAL_TUTORIAL_TARGET}를 승급시키려면, 태생 레어 정령을 재료로 준비해야 합니다.
      </p>
    </MessageBox>
  );
};

export const SpecialIntroPhase = ({ onComplete }) => {
  return (
    <MessageBox
      title="천악혼 타입 승급 규칙"
      onConfirm={onComplete}
      confirmText="네, 알겠습니다"
    >
      <p className="text-center">
        천사, 악마, 혼돈 타입 정령의 승급은 일반 타입보다 단순합니다.
      </p>
      <p className="mt-4 p-4 bg-indigo-100 text-indigo-800 rounded-lg text-center font-semibold">
        별도의 재료 없이, 오직 승급 대상과 똑같은 정령만을 재료로 사용합니다.
      </p>
      <p className="mt-4 p-4 bg-indigo-100 text-indigo-800 rounded-lg text-center font-semibold">
        레전더리를 2개 만들지 않도록 주의하면 됩니다.
      </p>
    </MessageBox>
  );
};

export const TutorialSelection = ({ onSelect }) => {
  return (
    <MessageBox title="에버소울 승급 튜토리얼" confirmText={null}>
      <p className="text-center mb-4">
        어떤 타입의 정령 승급을 체험하시겠습니까?
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => onSelect("일반", NORMAL_TUTORIAL_TARGET)}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-4 rounded-lg transition-colors duration-300"
        >
          <p className="font-bold text-lg">
            {NORMAL_TUTORIAL_TARGET}
          </p>
          <p className="text-sm mt-1">(인간, 야수, 요정, 불사)</p>
        </button>
        <button
          onClick={() => onSelect("특수", SPECIAL_TUTORIAL_TARGET)}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 px-4 rounded-lg transition-colors duration-300"
        >
          <p className="font-bold text-lg">
            {SPECIAL_TUTORIAL_TARGET}
          </p>
          <p className="text-sm mt-1">(천사, 악마, 혼돈)</p>
        </button>
      </div>
    </MessageBox>
  );
};

export const AutoPromotionModal = ({
  possiblePromotions,
  onConfirm,
  onClose,
}) => {
  return (
    <MessageBox
      title="자동 승급 (에픽 → 에픽+)"
      onConfirm={() => onConfirm(possiblePromotions)}
      confirmText="승급"
    >
      <p className="text-center text-sm text-gray-600 mb-2">
        아래 정령들을 에픽+ 등급으로 일괄 승급합니다.
      </p>
      <p className="text-center text-sm text-blue-600 font-semibold mb-4">
        자동 승급은 안전하므로 안심하세요!
      </p>
      <div className="space-y-4 max-h-60 overflow-y-auto p-2 bg-gray-100 rounded-lg">
        {possiblePromotions.map((promo) => (
          <div
            key={promo.name}
            className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CharacterCard
                card={createCard(promo.name, "Epic")}
                size="small"
              />
              <span className="font-bold">x {promo.consumeCount}</span>
            </div>
            <div className="text-2xl font-bold text-purple-500 mx-2">→</div>
            <div className="flex items-center gap-2">
              <CharacterCard
                card={createCard(promo.name, "Epic+")}
                size="small"
              />
              <span className="font-bold">x {promo.createCount}</span>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onClose}
        className="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
      >
        닫기
      </button>
    </MessageBox>
  );
};
