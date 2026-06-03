/**
 * Small "?" icon that reveals an explanation tooltip on hover.
 * Usage: <Tooltip text="Plain-language explanation" />
 */
export default function Tooltip({ text }) {
  return (
    <span className="relative group inline-flex items-center">
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gray-100 text-gray-400 text-[8px] font-bold cursor-help select-none hover:bg-indigo-100 hover:text-indigo-500 transition-colors ml-1">
        ?
      </span>
      {/* Popup */}
      <span className="
        absolute left-1/2 -translate-x-1/2 bottom-full mb-2
        w-56 bg-gray-900 text-white text-[11px] leading-relaxed
        rounded-xl px-3 py-2.5 shadow-xl
        opacity-0 group-hover:opacity-100 transition-opacity
        pointer-events-none z-50
      ">
        {text}
        {/* Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  )
}
