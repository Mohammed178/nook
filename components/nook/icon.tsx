import {
  Search,
  MapPin,
  SlidersHorizontal,
  LayoutGrid,
  Map as MapIcon,
  Heart,
  Star,
  Bed,
  Bath,
  Ruler,
  Wifi,
  Snowflake,
  Car,
  Dumbbell,
  Waves,
  Utensils,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  X,
  Filter,
  Calendar,
  User,
  Globe,
  Sun,
  Moon,
  Settings,
  Camera,
  Eye,
  EyeOff,
  LogOut,
  TrainFront,
  ShoppingBag,
  GraduationCap,
  Trees,
  Maximize2,
  Share2,
  BookmarkPlus,
  List as ListIcon,
  Menu as MenuIcon,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ICON_NAMES = [
  "search",
  "pin",
  "sliders",
  "grid",
  "map",
  "heart",
  "star",
  "bed",
  "bath",
  "ruler",
  "wifi",
  "snow",
  "car",
  "gym",
  "pool",
  "kitchen",
  "lock",
  "shield",
  "check",
  "phone",
  "mail",
  "chat",
  "whatsapp",
  "chevron-down",
  "chevron-right",
  "chevron-left",
  "chevron-up",
  "arrow-right",
  "arrow-left",
  "x",
  "filter",
  "calendar",
  "user",
  "globe",
  "sun",
  "moon",
  "settings",
  "camera",
  "eye",
  "eye-off",
  "log-out",
  "train",
  "bag",
  "school",
  "park",
  "sqft",
  "share",
  "heart-fill",
  "check-circle",
  "list",
  "bookmark",
  "menu",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

const MAP: Record<Exclude<IconName, "whatsapp" | "heart-fill">, React.ComponentType<LucideProps>> = {
  search: Search,
  pin: MapPin,
  sliders: SlidersHorizontal,
  grid: LayoutGrid,
  map: MapIcon,
  heart: Heart,
  star: Star,
  bed: Bed,
  bath: Bath,
  ruler: Ruler,
  wifi: Wifi,
  snow: Snowflake,
  car: Car,
  gym: Dumbbell,
  pool: Waves,
  kitchen: Utensils,
  lock: Lock,
  shield: ShieldCheck,
  check: CheckCircle2,
  phone: Phone,
  mail: Mail,
  chat: MessageCircle,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-up": ChevronUp,
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  x: X,
  filter: Filter,
  calendar: Calendar,
  user: User,
  globe: Globe,
  sun: Sun,
  moon: Moon,
  settings: Settings,
  camera: Camera,
  eye: Eye,
  "eye-off": EyeOff,
  "log-out": LogOut,
  train: TrainFront,
  bag: ShoppingBag,
  school: GraduationCap,
  park: Trees,
  sqft: Maximize2,
  share: Share2,
  "check-circle": CheckCircle2,
  list: ListIcon,
  bookmark: BookmarkPlus,
  menu: MenuIcon,
};

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

export function Icon({ name, className, size = 18, strokeWidth = 1.75, ...rest }: IconProps) {
  if (name === "heart-fill") {
    return (
      <Heart
        size={size}
        strokeWidth={strokeWidth}
        fill="currentColor"
        className={cn(className)}
        {...rest}
      />
    );
  }
  if (name === "whatsapp") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        className={cn(className)}
        aria-hidden="true"
        {...(rest as React.SVGProps<SVGSVGElement>)}
      >
        <path d="M20.52 3.48A11.83 11.83 0 0012.06 0C5.5 0 .15 5.34.14 11.9a11.84 11.84 0 001.6 5.95L0 24l6.32-1.66a11.86 11.86 0 005.74 1.46h.01c6.55 0 11.9-5.34 11.9-11.9a11.83 11.83 0 00-3.45-8.42zM12.07 21.8a9.86 9.86 0 01-5.03-1.38l-.36-.21-3.75.98 1-3.66-.23-.37a9.85 9.85 0 01-1.51-5.26c0-5.45 4.44-9.89 9.9-9.89a9.83 9.83 0 016.99 2.9 9.83 9.83 0 012.89 6.99c0 5.46-4.44 9.9-9.9 9.9zm5.43-7.41c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48a8.95 8.95 0 01-1.66-2.07c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.11 3.22 5.12 4.51.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35z" />
      </svg>
    );
  }
  const Cmp = MAP[name];
  return <Cmp size={size} strokeWidth={strokeWidth} className={cn(className)} {...rest} />;
}
