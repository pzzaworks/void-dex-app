import { docs, meta } from '../../.source/server';
import { toFumadocsSource } from 'fumadocs-mdx/runtime/server';
import { loader } from 'fumadocs-core/source';
import { createElement } from 'react';
import {
  Book,
  Sparkles,
  Wrench,
  Rocket,
  Info,
  Coins,
  Network,
  DollarSign,
  MessageSquare,
  Wallet,
  Send,
  Users,
  Activity,
  Check,
  RefreshCw,
  Search,
  ArrowRightLeft,
  TrendingUp,
  FileCode,
  BarChart3,
  BookOpen,
  Shield,
  Lock,
  Zap,
  Globe,
  Settings,
  Code,
  Eye,
  EyeOff,
  Key,
  Server,
  Layers,
  GitBranch,
} from 'lucide-react';

const iconMap = {
  Book,
  Sparkles,
  Tools: Wrench,
  Rocket,
  Info,
  Coins,
  Network,
  DollarSign,
  MessageSquare,
  Wallet,
  Send,
  Users,
  Activity,
  Check,
  RefreshCw,
  Search,
  ArrowRightLeft,
  TrendingUp,
  FileCode,
  BarChart3,
  BookOpen,
  Shield,
  Lock,
  Zap,
  Globe,
  Settings,
  Code,
  Eye,
  EyeOff,
  Key,
  Server,
  Layers,
  GitBranch,
};

export const source = loader({
  baseUrl: '/docs',
  source: toFumadocsSource(docs, meta),
  icon(icon) {
    if (icon && icon in iconMap) {
      const IconComponent = iconMap[icon as keyof typeof iconMap];
      return createElement(IconComponent, { className: 'w-4 h-4' });
    }
  },
});
