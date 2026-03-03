import { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "blue" | "purple";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-accent-green to-accent-green-hover hover:from-accent-green-hover hover:to-accent-green text-white border-transparent shadow-md hover:shadow-lg hover:shadow-accent-green/30",
  secondary:
    "bg-white hover:bg-cream-100 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md",
  ghost:
    "bg-transparent hover:bg-cream-200 text-gray-600 border border-transparent hover:border-gray-300 transition-all",
  danger:
    "bg-red-600 hover:bg-red-700 text-white border-transparent shadow-md hover:shadow-lg hover:shadow-red-500/30",
  success:
    "bg-gradient-to-r from-accent-green to-emerald-500 hover:from-accent-green-hover hover:to-emerald-600 text-white border-transparent shadow-md hover:shadow-lg hover:shadow-accent-green/30",
  blue:
    "bg-gradient-to-r from-accent-blue to-blue-500 hover:from-accent-blue-hover hover:to-blue-600 text-white border-transparent shadow-md hover:shadow-lg hover:shadow-accent-blue/30",
  purple:
    "bg-gradient-to-r from-accent-purple to-purple-500 hover:from-accent-purple-hover hover:to-purple-600 text-white border-transparent shadow-md hover:shadow-lg hover:shadow-accent-purple/30",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs gap-1 rounded-md",
  md: "px-4 py-2 text-sm gap-1.5 rounded-lg",
  lg: "px-5 py-2.5 text-base gap-2 rounded-lg",
};

export default function Button({
  variant = "secondary",
  size = "md",
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-200 select-none
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-green/40
        disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed
        active:scale-95
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
