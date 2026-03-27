import React from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Package, Calculator, BookMarked,
  TrendingUp, AlertTriangle, Plus, ArrowRight,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRecipes } from '../hooks/useRecipes'
import { useAllJournalEntries } from '../hooks/useJournalEntries'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { StatCardSkeleton } from '../components/common/Skeleton'
import { cn } from '../utils/cn'

// ── KPI Stat Card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconBg: string
  iconColor: string
  trend?: string
  loading?: boolean
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, icon: Icon, iconBg, iconColor, trend, loading,
}) => {
  if (loading) return <StatCardSkeleton />
  return (
    <div className="stat-card animate-fade-in-up">
      <div className={cn('stat-icon', iconBg)}>
        <Icon size={22} className={iconColor} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
        {trend && (
          <p className="text-xs text-success mt-0.5 flex items-center gap-1">
            <TrendingUp size={10} aria-hidden="true" />
            {trend}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Quick Action Card ─────────────────────────────────────────────────────────

interface QuickActionProps {
  to: string
  label: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconBg: string
  iconColor: string
}

const QuickActionCard: React.FC<QuickActionProps> = ({
  to, label, description, icon: Icon, iconBg, iconColor,
}) => (
  <Link to={to} className="block group">
    <div className={cn(
      'card p-5 flex items-center gap-4',
      'transition-all duration-150 hover:shadow-md hover:-translate-y-0.5',
      'animate-fade-in-up',
    )}>
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
        <Icon size={20} className={iconColor} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors text-sm">
          {label}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5 truncate">{description}</p>
      </div>
      <ArrowRight
        size={16}
        className="text-neutral-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
        aria-hidden="true"
      />
    </div>
  </Link>
)

// ── Dashboard Page ────────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth()
  const { data: recipesData, isLoading: recipesLoading } = useRecipes()
  const { data: journalData, isLoading: journalLoading } = useAllJournalEntries()

  const recipesCount = recipesData?.recipes?.length ?? 0
  const journalCount = Array.isArray(journalData) ? journalData.length : 0

  const firstName = currentUser?.display_name?.split(' ')[0] ?? 'Baker'

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Welcome banner ── */}
      <div className="relative overflow-hidden rounded-2xl gradient-brand p-6 sm:p-8 text-white">
        <div className="relative z-10">
          <p className="text-primary-100 text-sm font-medium mb-1">
            Welcome back
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">
            Hello, {firstName}! 👋
          </h2>
          <p className="text-primary-100 text-sm max-w-md">
            Ready to bake something amazing today? You have {recipesCount} recipes waiting for you.
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -right-4 -bottom-10 w-48 h-48 rounded-full bg-white/5" aria-hidden="true" />
      </div>

      {/* ── KPI Stats ── */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Key metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Recipes"
            value={recipesCount}
            icon={BookOpen}
            iconBg="bg-primary-50"
            iconColor="text-primary-500"
            loading={recipesLoading}
          />
          <StatCard
            label="Journal Entries"
            value={journalCount}
            icon={BookMarked}
            iconBg="bg-secondary-50"
            iconColor="text-secondary-500"
            loading={journalLoading}
          />
          <StatCard
            label="Inventory Alerts"
            value={0}
            icon={AlertTriangle}
            iconBg="bg-warning-light"
            iconColor="text-warning"
          />
          <StatCard
            label="Recipes This Month"
            value="—"
            icon={TrendingUp}
            iconBg="bg-success-light"
            iconColor="text-success"
          />
        </div>
      </section>

      {/* ── Quick Actions + New Recipe ── */}
      <section aria-labelledby="actions-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="actions-heading" className="text-lg font-bold font-display text-neutral-800">
            Quick Actions
          </h2>
          <Link to="/recipes/new">
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />}>
              New Recipe
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickActionCard
            to="/recipes"
            label="Browse Recipes"
            description="View and manage your collection"
            icon={BookOpen}
            iconBg="bg-primary-50"
            iconColor="text-primary-500"
          />
          <QuickActionCard
            to="/inventory"
            label="Check Inventory"
            description="Track ingredient stock levels"
            icon={Package}
            iconBg="bg-accent-50"
            iconColor="text-accent-600"
          />
          <QuickActionCard
            to="/costing"
            label="Recipe Costing"
            description="Calculate costs and margins"
            icon={Calculator}
            iconBg="bg-secondary-50"
            iconColor="text-secondary-500"
          />
          <QuickActionCard
            to="/journal"
            label="Baking Journal"
            description="Log your baking sessions"
            icon={BookMarked}
            iconBg="bg-success-light"
            iconColor="text-success"
          />
        </div>
      </section>

    </div>
  )
}
