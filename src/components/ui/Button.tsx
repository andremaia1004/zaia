import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
        const variants = {
            primary: "btn-primary bg-zaia-600 hover:bg-zaia-500 text-white shadow-lg shadow-zaia-600/20",
            outline: "border border-white/10 hover:border-zaia-500/50 hover:bg-zaia-500/10 text-slate-300 hover:text-zaia-300",
            ghost: "hover:bg-white/5 text-slate-400 hover:text-white",
            danger: "bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20",
        }

        const sizes = {
            sm: "px-3 py-1.5 text-xs",
            md: "px-4 py-2 text-sm",
            lg: "px-6 py-3 text-base",
            icon: "p-2",
        }

        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {loading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Carregando...
                    </>
                ) : children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
