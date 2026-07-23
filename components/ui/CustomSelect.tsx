"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export interface CustomSelectOption {
  value: string | number;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  labelPrefix?: string;
  icon?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
  menuWidth?: number | string;
  showSearch?: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  labelPrefix,
  icon,
  disabled = false,
  className = "",
  style,
  buttonStyle,
  menuWidth,
  showSearch = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 180 });
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      let targetWidth = rect.width;
      if (menuWidth) {
        const num = typeof menuWidth === "number" ? menuWidth : parseInt(String(menuWidth));
        if (num && !isNaN(num)) {
          targetWidth = Math.max(rect.width, num);
        }
      }

      let left = rect.left;
      if (left + targetWidth > window.innerWidth - 10) {
        left = Math.max(10, window.innerWidth - targetWidth - 10);
      }

      setDropdownPos({
        top: rect.bottom + 6,
        left: left,
        width: targetWidth
      });
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  const filteredOptions = showSearch
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  // Initialize and reset focusedIndex when dropdown opens or query changes
  useEffect(() => {
    if (isOpen) {
      const idx = filteredOptions.findIndex((opt) => String(opt.value) === String(value));
      setFocusedIndex(idx >= 0 ? idx : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, searchQuery, value]);

  // Click outside, scroll, resize, and keyboard listeners
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleScroll() {
      setIsOpen(false);
    }

    function handleResize() {
      updatePosition();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (filteredOptions.length === 0) return -1;
          const next = prev + 1;
          return next >= filteredOptions.length ? 0 : next;
        });
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (filteredOptions.length === 0) return -1;
          const next = prev - 1;
          return next < 0 ? filteredOptions.length - 1 : next;
        });
        return;
      }

      if (e.key === "Enter") {
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          e.preventDefault();
          const opt = filteredOptions[focusedIndex];
          if (!opt.disabled) {
            onChange(opt.value);
            setIsOpen(false);
            buttonRef.current?.focus();
          }
        }
        return;
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, filteredOptions, focusedIndex]);

  // Scroll focused option into view automatically
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && dropdownRef.current) {
      const el = dropdownRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, isOpen]);

  const menuContent = isOpen && (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: `${dropdownPos.top}px`,
        left: `${dropdownPos.left}px`,
        minWidth: `${dropdownPos.width}px`,
        width: "max-content",
        maxWidth: "calc(100vw - 20px)",
        maxHeight: "260px",
        overflowY: "auto",
        background: "rgba(15, 12, 27, 0.98)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(168, 85, 247, 0.4)",
        borderRadius: "10px",
        padding: "5px",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(168, 85, 247, 0.2)",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        gap: "2px"
      }}
    >
      {showSearch && (
        <div 
          style={{ 
            padding: "4px", 
            borderBottom: "1px solid rgba(255,255,255,0.06)", 
            marginBottom: "4px", 
            position: "sticky", 
            top: 0, 
            background: "rgba(15, 12, 27, 0.98)",
            zIndex: 10
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "8px", fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                borderRadius: "5px",
                padding: "4px 8px 4px 24px",
                fontSize: "0.72rem",
                color: "#fff",
                outline: "none",
              }}
              autoFocus
            />
          </div>
        </div>
      )}
      
      {filteredOptions.length === 0 ? (
        <div style={{ padding: "10px", color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", textAlign: "center" }}>
          No options found
        </div>
      ) : (
        filteredOptions.map((opt, index) => {
          const isSelected = String(opt.value) === String(value);
          const isFocused = index === focusedIndex;
          return (
            <div
              key={String(opt.value)}
              data-index={index}
              onClick={() => {
                if (opt.disabled) return;
                onChange(opt.value);
                setIsOpen(false);
                buttonRef.current?.focus();
              }}
              onMouseEnter={() => {
                if (!opt.disabled) {
                  setFocusedIndex(index);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "7px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: isSelected ? "bold" : "normal",
                color: opt.disabled ? "rgba(255, 255, 255, 0.3)" : isSelected ? "#fbbf24" : "#e2e8f0",
                background: isSelected 
                  ? "rgba(168, 85, 247, 0.25)" 
                  : isFocused 
                    ? "rgba(255, 255, 255, 0.08)" 
                    : "transparent",
                cursor: opt.disabled ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                opacity: opt.disabled ? 0.5 : 1
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {opt.icon && <i className={opt.icon} style={{ fontSize: "0.7rem", color: isSelected ? "#fbbf24" : "#c084fc" }} />}
                {opt.label}
              </span>
              {isSelected && <i className="fa-solid fa-check" style={{ fontSize: "0.7rem", color: "#fbbf24" }} />}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className={className} style={{ display: "inline-block", ...style }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        onKeyDown={(e) => {
          if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsOpen(true);
            updatePosition();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.55rem",
          background: disabled 
            ? "rgba(30, 25, 45, 0.5)"
            : "linear-gradient(135deg, rgba(25, 18, 45, 0.85) 0%, rgba(12, 9, 24, 0.95) 100%)",
          border: isOpen ? "1px solid rgba(168, 85, 247, 0.6)" : "1px solid rgba(168, 85, 247, 0.3)",
          borderRadius: "8px",
          padding: "5px 12px",
          color: disabled ? "rgba(255, 255, 255, 0.4)" : "#fff",
          fontSize: "0.78rem",
          fontWeight: "bold",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: isOpen ? "0 0 12px rgba(168, 85, 247, 0.25)" : "0 2px 8px rgba(0, 0, 0, 0.3)",
          transition: "all 0.2s ease",
          ...buttonStyle
        }}
      >
        {labelPrefix && (
          <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {labelPrefix}
          </span>
        )}
        <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {icon && <i className={icon} style={{ fontSize: "0.65rem", color: "#c084fc" }} />}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i
          className="fa-solid fa-chevron-down"
          style={{
            fontSize: "0.65rem",
            color: "rgba(255, 255, 255, 0.5)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            marginLeft: "auto"
          }}
        />
      </button>
      {mounted && createPortal(menuContent, document.body)}
    </div>
  );
}
