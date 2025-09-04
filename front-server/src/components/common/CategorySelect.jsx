import React, { useState, useRef, useEffect } from "react";
import Icon from "./Icon";
import DownIcon from '../../assets/icons/ic_arrow_down.svg'
import CheckIcon from '../../assets/icons/ic_check.svg'

const CategorySelect = ({ categories, selected, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* 선택 버튼 */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className=" w-full bg-white border border-gray-300 rounded-md space-x-1 py-2.5 px-3 text-left text-sm shadow-md flex items-center justify-between hover:shadow-lg transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className="truncate text-gray-800 font-medium">{selected.label}</span>
        <Icon
          src={DownIcon}
          alt="아래 화살표"
          className={`!w-5 !h-5  transform transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* 옵션 드롭다운 */}
      <div
        className={`w-full absolute mt-1 bg-white border border-gray-300 rounded-md shadow-md max-h-64 overflow-auto z-20 transition-all duration-200 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        {categories.map((item) => {
          const isSelected = item.value === selected.value;
          return (
            <div
              key={item.value}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
              className={`cursor-pointer select-none relative py-2 pl-5 pr-10 mb-1 rounded-md transition-colors ${
                isSelected
                  ? "bg-primary text-white font-semibold shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className={`block truncate ${isSelected ? "font-semibold" : "font-normal"}`}>
                {item.label}
              </span>
              {isSelected && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-white">
                  <img src={CheckIcon} className="h-4 w-4 filter invert" alt="체크 아이콘" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategorySelect;