# LexForge Institutional Design System

> Source of truth for LexForge's high-precision, institutional visual language.

---

## 🎨 Palette

| Role | Color | Hex | Sample |
| :--- | :--- | :--- | :--- |
| **Background** | Cool Off-White | `#F8FAFC` | ![#F8FAFC](https://via.placeholder.com/15/F8FAFC?text=+) |
| **Surface** | Pure White | `#FFFFFF` | ![#FFFFFF](https://via.placeholder.com/15/FFFFFF?text=+) |
| **Primary Accent** | Vibrant Coral | `#FF7043` | ![#FF7043](https://via.placeholder.com/15/FF7043?text=+) |
| **Borders** | Soft Slate | `#E2E8F0` | ![#E2E8F0](https://via.placeholder.com/15/E2E8F0?text=+) |
| **High Risk** | Coral | `#FF7043` | |
| **Moderate Risk** | Slate | `#475569` | |
| **Low/Advisory** | Dark Gold | `#B8860B` | |

---

## ✍️ Typography

- **System Font**: Inter (Google Fonts)
- **Hero Numbers**: `text-8xl` (96px), `font-light` (300), `tracking-tight`
- **Section Headers**: `text-3xl` (30px), `font-extralight` (200)
- **Metadata**: `text-xs`, `font-medium`, `text-slate-500`

---

## 🧱 Component Specs

### Cards
- **Background**: `#FFFFFF`
- **Border**: `1px solid #E2E8F0`
- **Corner Radius**: `8px` (Modern Premium)
- **Elevation**: Multi-layered diffused shadows for "floating" effect.

### Sidebar
- **Width (Collapsed)**: `64px` (Icon-only)
- **Expansion**: Slide-out transition on hover.
- **Backdrop**: `backdrop-blur-md` overlay when expanded.
- **Active State**: Indicator in Vibrant Coral.

### Charts
- **Risk Distribution**: Dashed donut segments (Coral).
- **Metric Trends**: Smooth area charts with `opacity-10` gradient fades.

---

## 📏 Layout Principles

1. **Massive Whitespace**: Use `p-12` or `p-16` for main containers to evoke "Airy focus".
2. **Executive Density**: Table rows should have `h-20` minimum height to maintain the "Summary" feel.
3. **Typography as Hero**: Metrics should be the largest visual element on the page.
