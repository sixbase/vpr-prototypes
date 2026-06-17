import { useState, useEffect, useRef } from 'react';
import {
  X, CheckCircle, ChevronRight, ChevronDown, Check, Shield, ShieldCheck, Mail,
  Send, ArrowLeft, Minus, Cloud, Globe, Lock, Building2, Users, Bug
} from '@icons';
import { typeConfig } from './config';

// ── Constants ──────────────────────────────────────────────────────────────────

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'Japan', 'France', 'India', 'Brazil', 'Netherlands',
  'Singapore', 'Sweden', 'South Korea', 'Italy', 'Spain', 'Mexico',
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Madrid', 'Asia/Tokyo', 'Asia/Singapore',
  'Asia/Kolkata', 'Australia/Sydney', 'Pacific/Auckland',
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Portuguese'];

const PRODUCTS = [
  // IES
  { key: 'ies',                category: 'IES',      Icon: Mail,        iconColor: 'text-indigo-500', name: 'VIPRE IES',                             description: 'Advanced cloud-native email security technology that integrates seamlessly via API.',                                           borderAccent: 'border-indigo-500', bgAccent: 'bg-indigo-50 dark:bg-indigo-950/30', ringAccent: 'ring-indigo-300 dark:ring-indigo-700' },
  { key: 'ies-beta',           category: 'IES',      Icon: Mail,        iconColor: 'text-indigo-400', name: 'VIPRE IES BETA',                        description: 'Beta release of VIPRE Integrated Email Security with the latest threat protection updates.',                                 borderAccent: 'border-indigo-400', bgAccent: 'bg-indigo-50 dark:bg-indigo-950/30', ringAccent: 'ring-indigo-200 dark:ring-indigo-800' },
  // SafeSend
  { key: 'safesend',           category: 'SafeSend', Icon: Send,        iconColor: 'text-emerald-500',name: 'VIPRE SafeSend',                        description: 'Outbound email safety prompts to prevent misdirected emails and accidental data leaks.',                                    borderAccent: 'border-emerald-500',bgAccent: 'bg-emerald-50 dark:bg-emerald-950/30',ringAccent: 'ring-emerald-300 dark:ring-emerald-700' },
  { key: 'safesend-ai',        category: 'SafeSend', Icon: Send,        iconColor: 'text-emerald-600',name: 'VIPRE SafeSend + AI addon',             description: 'SafeSend with AI-powered content analysis for smarter outbound email safety checks.',                                       borderAccent: 'border-emerald-600',bgAccent: 'bg-emerald-50 dark:bg-emerald-950/30',ringAccent: 'ring-emerald-300 dark:ring-emerald-700' },
  { key: 'safesend-beta',      category: 'SafeSend', Icon: Send,        iconColor: 'text-emerald-400',name: 'VIPRE SafeSend Beta',                   description: 'Beta release of VIPRE SafeSend with the latest outbound email safety features.',                                            borderAccent: 'border-emerald-400',bgAccent: 'bg-emerald-50 dark:bg-emerald-950/30',ringAccent: 'ring-emerald-200 dark:ring-emerald-800' },
  // Security / Email SEG
  { key: 'tep',                category: 'Security', Icon: ShieldCheck, iconColor: 'text-violet-500', name: 'VIPRE Total Email Protection',          description: 'Comprehensive multi-tier protection combining SEG and IES — the only package with both.',                                   borderAccent: 'border-violet-500', bgAccent: 'bg-violet-50 dark:bg-violet-950/30', ringAccent: 'ring-violet-300 dark:ring-violet-700' },
  { key: 'atp',                category: 'Security', Icon: Bug,         iconColor: 'text-rose-500',   name: 'Advanced Threat Protection',            description: 'Core VIPRE Email Security Cloud with EDR and attachment sandboxing.',                                                        borderAccent: 'border-rose-500',   bgAccent: 'bg-rose-50 dark:bg-rose-950/30',     ringAccent: 'ring-rose-300 dark:ring-rose-700' },
  { key: 'edge',               category: 'Security', Icon: Globe,       iconColor: 'text-cyan-500',   name: 'Edge Defense',                          description: 'Comprehensive email protection bundle including Email IES and DNS navigation.',                                              borderAccent: 'border-cyan-500',   bgAccent: 'bg-cyan-50 dark:bg-cyan-950/30',     ringAccent: 'ring-cyan-300 dark:ring-cyan-700' },
  { key: 'complete',           category: 'Security', Icon: Shield,      iconColor: 'text-blue-600',   name: 'Complete Defense',                      description: 'Comprehensive email protection bundle including Email IES and DNS navigation.',                                              borderAccent: 'border-blue-600',   bgAccent: 'bg-blue-50 dark:bg-blue-950/30',     ringAccent: 'ring-blue-300 dark:ring-blue-700' },
  { key: 'edge-nordics',       category: 'Security', Icon: Globe,       iconColor: 'text-cyan-600',   name: 'Edge Defense Nordics',                  description: 'Edge Defense bundle with Email IES and SafeSend, tailored for Nordic markets.',                                              borderAccent: 'border-cyan-600',   bgAccent: 'bg-cyan-50 dark:bg-cyan-950/30',     ringAccent: 'ring-cyan-300 dark:ring-cyan-700' },
  { key: 'complete-nordics',   category: 'Security', Icon: Shield,      iconColor: 'text-blue-700',   name: 'Complete Defense Nordics',              description: 'Complete Defense bundle with Email IES and SafeSend, tailored for Nordic markets.',                                          borderAccent: 'border-blue-700',   bgAccent: 'bg-blue-50 dark:bg-blue-950/30',     ringAccent: 'ring-blue-300 dark:ring-blue-700' },
  { key: 'email360',           category: 'Security', Icon: Mail,        iconColor: 'text-violet-600', name: 'VIPRE Email 360',                       description: 'Full solution combining VIPRE System EndPoint Enhanced Threat Protection with Security Awareness Training.',                  borderAccent: 'border-violet-600', bgAccent: 'bg-violet-50 dark:bg-violet-950/30', ringAccent: 'ring-violet-300 dark:ring-violet-700' },
  { key: 'epmail',             category: 'Security', Icon: Users,       iconColor: 'text-teal-500',   name: 'VIPRE Endpoint+Email',                  description: 'Combination of VIPRE Endpoint Cloud and Email Cloud for essential protection.',                                              borderAccent: 'border-teal-500',   bgAccent: 'bg-teal-50 dark:bg-teal-950/30',     ringAccent: 'ring-teal-300 dark:ring-teal-700' },
  { key: 'epmail360',          category: 'Security', Icon: Users,       iconColor: 'text-teal-600',   name: 'VIPRE Endpoint+Email 360',              description: 'Next-gen email and endpoint threat protection with Security Awareness Training.',                                           borderAccent: 'border-teal-600',   bgAccent: 'bg-teal-50 dark:bg-teal-950/30',     ringAccent: 'ring-teal-300 dark:ring-teal-700' },
  { key: 'essentials',         category: 'Security', Icon: Shield,      iconColor: 'text-blue-500',   name: 'Essentials',                            description: 'Protect your organisation from spam and viruses with 30-day email replay and 7-day email assist.',                          borderAccent: 'border-blue-500',   bgAccent: 'bg-blue-50 dark:bg-blue-950/30',     ringAccent: 'ring-blue-300 dark:ring-blue-700' },
  { key: 'emailcloud',         category: 'Security', Icon: Cloud,       iconColor: 'text-sky-500',    name: 'Email Cloud',                           description: 'Get additional security with Email Cloud and protect yourself from unplanned email outages. Includes 90 days of continuity.', borderAccent: 'border-sky-500',    bgAccent: 'bg-sky-50 dark:bg-sky-950/30',       ringAccent: 'ring-sky-300 dark:ring-sky-700' },
  { key: 'exchangesmart',      category: 'Security', Icon: Mail,        iconColor: 'text-sky-600',    name: 'ExchangeSMART',                         description: 'All the enhanced collaboration features of Microsoft Exchange with email filtering, PrivacySMART, and 14-day email replay.',  borderAccent: 'border-sky-600',    bgAccent: 'bg-sky-50 dark:bg-sky-950/30',       ringAccent: 'ring-sky-300 dark:ring-sky-700' },
  { key: 'exchangesmart-suite',category: 'Security', Icon: Mail,        iconColor: 'text-sky-700',    name: 'ExchangeSMART Suite',                   description: 'The complete Microsoft Exchange bundle including unlimited archiving, compliance scanning, and extended search.',               borderAccent: 'border-sky-700',    bgAccent: 'bg-sky-50 dark:bg-sky-950/30',       ringAccent: 'ring-sky-300 dark:ring-sky-700' },
  { key: 'essentials-inbound', category: 'Security', Icon: Shield,      iconColor: 'text-blue-400',   name: 'Essentials Inbound Only',               description: 'Get unlimited security with SecureSmart and protect yourself from unplanned email outages. Includes 90 days of Email Continuity.', borderAccent: 'border-blue-400',   bgAccent: 'bg-blue-50 dark:bg-blue-950/30',     ringAccent: 'ring-blue-200 dark:ring-blue-800' },
  { key: 'vaultcritical',      category: 'Security', Icon: Lock,        iconColor: 'text-amber-500',  name: 'VaultCritical Suite',                   description: 'Seamlessly pairs cloud email archiving with "Email Cloud" giving world-class archiving and email continuity.',                  borderAccent: 'border-amber-500',  bgAccent: 'bg-amber-50 dark:bg-amber-950/30',   ringAccent: 'ring-amber-300 dark:ring-amber-700' },
];

const SEG_ADD_ONS = ['Legacy Archiving, 3 years', 'Legacy Archiving, unlimited', 'Image Analyzer', 'DNS Service', 'Extended Message Logs - 1 year', 'Extended Message Logs - 5 years', 'Extended Message Logs - 10 years'];

const PRODUCT_PERMISSIONS_DEF = {
  // IES — no add-ons
  'ies':                { name: 'VIPRE IES',                   Icon: Mail,        iconColor: 'text-indigo-500', addOns: [] },
  'ies-beta':           { name: 'VIPRE IES BETA',              Icon: Mail,        iconColor: 'text-indigo-400', addOns: [] },
  // SafeSend — no add-ons
  'safesend':           { name: 'VIPRE SafeSend',              Icon: Send,        iconColor: 'text-emerald-500',addOns: [] },
  'safesend-ai':        { name: 'VIPRE SafeSend + AI addon',   Icon: Send,        iconColor: 'text-emerald-600',addOns: [] },
  'safesend-beta':      { name: 'VIPRE SafeSend Beta',         Icon: Send,        iconColor: 'text-emerald-400',addOns: [] },
  // Security / Email SEG — all support SEG add-ons
  'tep':                { name: 'VIPRE Total Email Protection', Icon: ShieldCheck, iconColor: 'text-violet-500', addOns: SEG_ADD_ONS },
  'atp':                { name: 'Advanced Threat Protection',   Icon: Bug,         iconColor: 'text-rose-500',   addOns: SEG_ADD_ONS },
  'edge':               { name: 'Edge Defense',                 Icon: Globe,       iconColor: 'text-cyan-500',   addOns: SEG_ADD_ONS },
  'complete':           { name: 'Complete Defense',             Icon: Shield,      iconColor: 'text-blue-600',   addOns: SEG_ADD_ONS },
  'edge-nordics':       { name: 'Edge Defense Nordics',         Icon: Globe,       iconColor: 'text-cyan-600',   addOns: SEG_ADD_ONS },
  'complete-nordics':   { name: 'Complete Defense Nordics',     Icon: Shield,      iconColor: 'text-blue-700',   addOns: SEG_ADD_ONS },
  'email360':           { name: 'VIPRE Email 360',              Icon: Mail,        iconColor: 'text-violet-600', addOns: SEG_ADD_ONS },
  'epmail':             { name: 'VIPRE Endpoint+Email',         Icon: Users,       iconColor: 'text-teal-500',   addOns: SEG_ADD_ONS },
  'epmail360':          { name: 'VIPRE Endpoint+Email 360',     Icon: Users,       iconColor: 'text-teal-600',   addOns: SEG_ADD_ONS },
  'essentials':         { name: 'Essentials',                   Icon: Shield,      iconColor: 'text-blue-500',   addOns: SEG_ADD_ONS },
  'emailcloud':         { name: 'Email Cloud',                  Icon: Cloud,       iconColor: 'text-sky-500',    addOns: SEG_ADD_ONS },
  'exchangesmart':      { name: 'ExchangeSMART',                Icon: Mail,        iconColor: 'text-sky-600',    addOns: SEG_ADD_ONS },
  'exchangesmart-suite':{ name: 'ExchangeSMART Suite',          Icon: Mail,        iconColor: 'text-sky-700',    addOns: SEG_ADD_ONS },
  'essentials-inbound': { name: 'Essentials Inbound Only',      Icon: Shield,      iconColor: 'text-blue-400',   addOns: SEG_ADD_ONS },
  'vaultcritical':      { name: 'VaultCritical Suite',          Icon: Lock,        iconColor: 'text-amber-500',  addOns: SEG_ADD_ONS },
};

function defaultPermissions() {
  const perms = {};
  for (const [key, def] of Object.entries(PRODUCT_PERMISSIONS_DEF)) {
    perms[key] = {
      enabled: true,
      addOns: Object.fromEntries(def.addOns.map(a => [a, true])),
    };
  }
  return perms;
}

// ── Shared form primitives ─────────────────────────────────────────────────────

function FormField({ label, error, optional, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        {label}
        {optional && <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-normal">(Optional)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

function FormInput({ error, ...props }) {
  return (
    <input
      className={`w-full px-3 py-2.5 text-sm rounded-md outline-none transition-colors
        bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400
        focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-zinc-900
        ${error
          ? 'border border-rose-400 dark:border-rose-500 focus:ring-rose-400'
          : 'border border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 focus:ring-blue-500 focus:border-blue-500'
        }`}
      {...props}
    />
  );
}

function FormSelect({ error, options, placeholder, value, onChange, onBlur, disabled }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        className={`w-full px-3 py-2.5 text-sm rounded-md outline-none appearance-none transition-colors
          bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
          focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-zinc-900
          ${error
            ? 'border border-rose-400 dark:border-rose-500 focus:ring-rose-400'
            : 'border border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 focus:ring-blue-500 focus:border-blue-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt =>
          typeof opt === 'string'
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        )}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 mt-6 mb-2 first:mt-0">{children}</p>
  );
}

function PrimaryButton({ disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors
        ${disabled
          ? 'bg-blue-400 dark:bg-blue-800 opacity-50 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
        }`}
    >
      {children}
    </button>
  );
}

function CancelButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer transition-colors"
    >
      Cancel
    </button>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
  );
}

// ── Modal shell ────────────────────────────────────────────────────────────────

function ModalShell({ title, subtitle, onClose, footer, children, maxWidth = '560px' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/50" onClick={onClose} />
      <div
        className="relative w-full bg-white dark:bg-zinc-900 rounded-xl shadow-2xl flex flex-col animate-palette-in overflow-hidden"
        style={{ maxWidth }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ml-4 flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Confirmation hub ───────────────────────────────────────────────────────────

function ConfirmationHub({ title, subtitle, actions, onClose }) {
  return (
    <ModalShell title="" onClose={onClose} maxWidth="480px">
      <div className="flex flex-col items-center px-6 py-8">
        <CheckCircle className="w-12 h-12 text-emerald-500 mb-4 flex-shrink-0" />
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1 text-center">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6 max-w-xs leading-relaxed">{subtitle}</p>
        <div className="w-full space-y-3">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className="w-full flex items-center justify-between px-4 h-12 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer group"
            >
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                {action.label}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validateField(field, value) {
  if (!value || (typeof value === 'string' && !value.trim())) return 'This field is required';
  if (field === 'email' && !validateEmail(value)) return 'Please enter a valid email address';
  if (field === 'seats' && (isNaN(Number(value)) || Number(value) < 1)) return 'Must be at least 1';
  return '';
}

function useForm(initialFields) {
  const [data, setData] = useState(initialFields);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  function set(field, value) {
    setData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }

  function blur(field) {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = validateField(field, data[field]);
    setErrors(prev => ({ ...prev, [field]: err }));
  }

  function validate(requiredFields) {
    const newErrors = {};
    for (const f of requiredFields) {
      const err = validateField(f, data[f]);
      if (err) newErrors[f] = err;
    }
    setErrors(newErrors);
    setTouched(requiredFields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    return Object.keys(newErrors).length === 0;
  }

  function reset(newData = initialFields) {
    setData(newData);
    setErrors({});
    setTouched({});
  }

  function isValid(requiredFields) {
    return requiredFields.every(f => data[f] && !errors[f]);
  }

  return { data, set, blur, touched, errors, validate, reset, isValid };
}

// ── Type selection step ────────────────────────────────────────────────────────

const TYPE_META = {
  distributor: { label: 'Add Distributor', description: 'Set up a new distribution partner' },
  reseller:    { label: 'Add Reseller',    description: 'Onboard a new reseller into your channel' },
  customer:    { label: 'Add Customer',    description: 'Create a new end customer account' },
};

function TypeSelectionStep({ availableTypes, onSelect, onClose }) {
  return (
    <ModalShell
      title="Add Account"
      subtitle="What type of account would you like to add?"
      onClose={onClose}
      maxWidth="480px"
    >
      <div className="px-6 pt-5 pb-6 space-y-3">
        {availableTypes.map(type => {
          const cfg = typeConfig[type];
          const meta = TYPE_META[type];
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="w-full flex items-center gap-4 px-4 h-16 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer group text-left"
            >
              <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{meta.label}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{meta.description}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

// ── Flow 1: Add Customer ───────────────────────────────────────────────────────

const CUSTOMER_REQUIRED = [
  'subscriptionType', 'customerName', 'companyName', 'address',
  'city', 'stateProvince', 'zip', 'country',
  'contactName', 'email', 'phone',
];

function AddCustomerFlow({ onClose, onSuccess, onSwitchToProduct }) {
  const [step, setStep] = useState(1);
  const form = useForm({
    subscriptionType: '', customerName: '', companyName: '',
    address: '', address2: '', city: '', stateProvince: '', zip: '', country: '',
    contactName: '', email: '', phone: '',
  });

  const displayName = form.data.customerName || form.data.companyName || 'the customer';
  const formIsValid = form.isValid(CUSTOMER_REQUIRED);

  function handleSubmit() {
    if (form.validate(CUSTOMER_REQUIRED)) setStep(2);
  }

  if (step === 2) {
    return (
      <ConfirmationHub
        title="Customer Added"
        subtitle={`${displayName} has been created successfully`}
        onClose={onClose}
        actions={[
          {
            label: 'Add Products',
            onClick: () => onSwitchToProduct(displayName),
          },
          {
            label: 'Add Another Customer',
            onClick: () => {
              form.reset();
              setStep(1);
            },
          },
          {
            label: 'Go to Customer List',
            onClick: () => {
              onSuccess(`${displayName} has been added`);
              onClose();
            },
          },
        ]}
      />
    );
  }

  return (
    <ModalShell
      title="Add Customer"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <PrimaryButton onClick={handleSubmit} disabled={!formIsValid}>
            Create Customer
          </PrimaryButton>
        </>
      }
    >
      <div className="px-6 pt-5 pb-6 space-y-4">
        {/* Subscription type + customer name — top row */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Subscription Type" error={form.touched.subscriptionType && form.errors.subscriptionType}>
            <FormSelect
              value={form.data.subscriptionType}
              onChange={e => form.set('subscriptionType', e.target.value)}
              onBlur={() => form.blur('subscriptionType')}
              error={form.touched.subscriptionType && form.errors.subscriptionType}
              placeholder="Select type"
              options={['Annual', 'Monthly', 'Prepaid', 'NFR']}
            />
          </FormField>
          <FormField label="Customer Name" error={form.touched.customerName && form.errors.customerName}>
            <FormInput
              value={form.data.customerName}
              onChange={e => form.set('customerName', e.target.value)}
              onBlur={() => form.blur('customerName')}
              error={form.touched.customerName && form.errors.customerName}
              placeholder="Display name"
            />
          </FormField>
        </div>

        <SectionLabel>Company Information</SectionLabel>

        <FormField label="Company Name" error={form.touched.companyName && form.errors.companyName}>
          <FormInput value={form.data.companyName} onChange={e => form.set('companyName', e.target.value)} onBlur={() => form.blur('companyName')} error={form.touched.companyName && form.errors.companyName} placeholder="Legal company name" />
        </FormField>
        <FormField label="Address" error={form.touched.address && form.errors.address}>
          <FormInput value={form.data.address} onChange={e => form.set('address', e.target.value)} onBlur={() => form.blur('address')} error={form.touched.address && form.errors.address} placeholder="Street address" />
        </FormField>
        <FormField label="Address 2" optional>
          <FormInput value={form.data.address2} onChange={e => form.set('address2', e.target.value)} placeholder="Suite, unit, floor…" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="City" error={form.touched.city && form.errors.city}>
            <FormInput value={form.data.city} onChange={e => form.set('city', e.target.value)} onBlur={() => form.blur('city')} error={form.touched.city && form.errors.city} placeholder="City" />
          </FormField>
          <FormField label="State / Province" error={form.touched.stateProvince && form.errors.stateProvince}>
            <FormInput value={form.data.stateProvince} onChange={e => form.set('stateProvince', e.target.value)} onBlur={() => form.blur('stateProvince')} error={form.touched.stateProvince && form.errors.stateProvince} placeholder="State or province" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="ZIP / Postal Code" error={form.touched.zip && form.errors.zip}>
            <FormInput value={form.data.zip} onChange={e => form.set('zip', e.target.value)} onBlur={() => form.blur('zip')} error={form.touched.zip && form.errors.zip} placeholder="ZIP or postal code" />
          </FormField>
          <FormField label="Country" error={form.touched.country && form.errors.country}>
            <FormSelect value={form.data.country} onChange={e => form.set('country', e.target.value)} onBlur={() => form.blur('country')} error={form.touched.country && form.errors.country} placeholder="Select country" options={COUNTRIES} />
          </FormField>
        </div>

        <SectionLabel>Primary Contact Information</SectionLabel>

        <FormField label="Contact Name" error={form.touched.contactName && form.errors.contactName}>
          <FormInput value={form.data.contactName} onChange={e => form.set('contactName', e.target.value)} onBlur={() => form.blur('contactName')} error={form.touched.contactName && form.errors.contactName} placeholder="Full name" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" error={form.touched.email && form.errors.email}>
            <FormInput type="email" value={form.data.email} onChange={e => form.set('email', e.target.value)} onBlur={() => form.blur('email')} error={form.touched.email && form.errors.email} placeholder="contact@company.com" />
          </FormField>
          <FormField label="Phone" error={form.touched.phone && form.errors.phone}>
            <FormInput type="tel" value={form.data.phone} onChange={e => form.set('phone', e.target.value)} onBlur={() => form.blur('phone')} error={form.touched.phone && form.errors.phone} placeholder="+1 (555) 000-0000" />
          </FormField>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Flow 2: Add Product ────────────────────────────────────────────────────────

function getConfigRequired(productKey) {
  const withPlan = ['tep', 'ies', 'emailcloud', 'complete', 'epmail'];
  if (withPlan.includes(productKey)) return ['siteName', 'billingType', 'seats', 'plan'];
  return ['siteName', 'billingType', 'seats'];
}

function ProductConfigFields({ productKey, customerName, configForm }) {
  const { data, set, blur, touched, errors } = configForm;

  const product = PRODUCTS.find(p => p.key === productKey);
  const withPlan = ['tep', 'ies', 'emailcloud', 'complete', 'epmail'];
  const packageAddOns = PRODUCT_PERMISSIONS_DEF[productKey]?.addOns || [];

  return (
    <div className="px-6 pt-5 pb-6 space-y-4">
      <FormField label="Site Name" error={touched.siteName && errors.siteName}>
        <FormInput
          value={data.siteName || ''}
          onChange={e => set('siteName', e.target.value)}
          onBlur={() => blur('siteName')}
          error={touched.siteName && errors.siteName}
          placeholder={`${customerName} - ${product?.name || productKey}`}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Billing Type" error={touched.billingType && errors.billingType}>
          <FormSelect value={data.billingType || ''} onChange={e => set('billingType', e.target.value)} onBlur={() => blur('billingType')} error={touched.billingType && errors.billingType} placeholder="Select billing" options={['Billed', 'Trial']} />
        </FormField>
        <FormField label="Estimated Seats" error={touched.seats && errors.seats}>
          <FormInput type="number" min="1" value={data.seats || ''} onChange={e => set('seats', e.target.value)} onBlur={() => blur('seats')} error={touched.seats && errors.seats} placeholder="e.g. 50" />
        </FormField>
      </div>

      {withPlan.includes(productKey) && (
        <FormField label="Plan" error={touched.plan && errors.plan}>
          <FormSelect value={data.plan || ''} onChange={e => set('plan', e.target.value)} onBlur={() => blur('plan')} error={touched.plan && errors.plan} placeholder="Select plan" options={['Standard', 'Advanced', 'Premium']} />
        </FormField>
      )}

      {packageAddOns.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Add-ons <span className="ml-1.5 text-xs text-zinc-400 font-normal">(Optional)</span>
          </label>
          <div className="space-y-2">
            {packageAddOns.map(addon => (
              <label key={addon} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!(data.addOns || {})[addon]}
                  onChange={e => {
                    const next = { ...(data.addOns || {}) };
                    if (e.target.checked) next[addon] = true;
                    else delete next[addon];
                    set('addOns', next);
                  }}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">{addon}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddProductFlow({ onClose, onSuccess, customerName = 'Customer', existingProductKeys = [] }) {
  const [step, setStep] = useState(1);
  const [selectedProductKey, setSelectedProductKey] = useState(null);
  const configForm = useForm({ siteType: '', siteName: '', billingType: '', seats: '', plan: '', addOns: {} });

  const available = PRODUCTS.filter(p => !existingProductKeys.includes(p.key));
  const selectedProduct = PRODUCTS.find(p => p.key === selectedProductKey);
  const configRequired = selectedProductKey ? getConfigRequired(selectedProductKey) : [];
  const configIsValid = configRequired.every(f => configForm.data[f]);

  function handleSelectProduct(key) {
    setSelectedProductKey(key);
    const product = PRODUCTS.find(p => p.key === key);
    configForm.reset({ siteName: `${customerName} - ${product?.name || key}`, billingType: '', seats: '', plan: '', addOns: {} });
  }

  function handleConfigure() {
    if (configForm.validate(configRequired)) setStep(3);
  }

  // Step 1: product selection
  if (step === 1) {
    if (available.length === 0) {
      return (
        <ModalShell
          title="Add Product"
          subtitle={customerName ? `Add Product to ${customerName}` : undefined}
          onClose={onClose}
          footer={
            <>
              <span />
              <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">Done</button>
            </>
          }
        >
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">This customer has all available packages</p>
          </div>
        </ModalShell>
      );
    }

    return (
      <ModalShell
        title="Add Package"
        subtitle={customerName ? `Add Package to ${customerName}` : undefined}
        onClose={onClose}
        footer={
          <>
            <CancelButton onClick={onClose} />
            <PrimaryButton onClick={() => setStep(2)} disabled={!selectedProductKey}>
              Next
            </PrimaryButton>
          </>
        }
      >
        <div className="px-6 pt-5 pb-6 space-y-5">
          {['IES', 'SafeSend', 'Security'].map(catKey => {
            const group = available.filter(p => p.category === catKey);
            if (group.length === 0) return null;
            return (
              <div key={catKey}>
                <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">{catKey}</div>
                <div className="space-y-2">
                  {group.map(product => {
                    const { Icon } = product;
                    const isSelected = selectedProductKey === product.key;
                    return (
                      <button
                        key={product.key}
                        onClick={() => handleSelectProduct(product.key)}
                        className={`w-full flex items-center gap-4 px-4 h-16 rounded-lg border text-left transition-all cursor-pointer
                          ${isSelected
                            ? `${product.borderAccent} ${product.bgAccent} ring-1 ${product.ringAccent}`
                            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${product.iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">{product.name}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{product.description}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                          ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-zinc-300 dark:border-zinc-600'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ModalShell>
    );
  }

  // Step 2: product configuration
  if (step === 2 && selectedProduct) {
    const { Icon } = selectedProduct;
    return (
      <ModalShell
        title={`Configure ${selectedProduct.name}`}
        subtitle={customerName ? `Setting up for ${customerName}` : undefined}
        onClose={onClose}
        footer={
          <>
            <BackButton onClick={() => setStep(1)} />
            <div className="flex items-center gap-3">
              <CancelButton onClick={onClose} />
              <PrimaryButton onClick={handleConfigure} disabled={!configIsValid}>
                Add Product
              </PrimaryButton>
            </div>
          </>
        }
      >
        <ProductConfigFields
          productKey={selectedProductKey}
          customerName={customerName}
          configForm={configForm}
        />
      </ModalShell>
    );
  }

  // Step 3: confirmation
  return (
    <ConfirmationHub
      title="Product Added"
      subtitle={`${selectedProduct?.name ?? 'Product'} has been added to ${customerName}`}
      onClose={onClose}
      actions={[
        {
          label: 'Add Another Product',
          onClick: () => {
            setStep(1);
            setSelectedProductKey(null);
            configForm.reset({ siteType: '', siteName: '', billingType: '', seats: '', plan: '', addOns: {} });
          },
        },
        {
          label: 'View Customer',
          onClick: () => {
            onSuccess(`${selectedProduct?.name} added to ${customerName}`);
            onClose();
          },
        },
        {
          label: 'Go to Customer List',
          onClick: () => {
            onSuccess(`${selectedProduct?.name} added to ${customerName}`);
            onClose();
          },
        },
      ]}
    />
  );
}

// ── Flows 4 & 5: Add Reseller / Add Distributor ────────────────────────────────

const RESELLER_REQUIRED = [
  'companyName', 'address', 'city', 'stateProvince', 'zip', 'country', 'timezone', 'language',
];

function TriStateCheckbox({ checked, indeterminate, onChange, label, iconColor, Icon: IconComp }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
      />
      {IconComp && <IconComp className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />}
      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">{label}</span>
    </label>
  );
}

function AddPartnerFlow({ entityType, onClose, onSuccess }) {
  const label = entityType === 'distributor' ? 'Distributor' : 'Reseller';
  const [step, setStep] = useState(1);
  const form = useForm({
    companyName: '', address: '', address2: '', city: '', stateProvince: '', zip: '',
    country: '', timezone: 'America/New_York', language: 'English',
  });
  const [permissions, setPermissions] = useState(defaultPermissions);
  const partnerName = form.data.companyName || `the ${label.toLowerCase()}`;
  const formIsValid = form.isValid(RESELLER_REQUIRED);

  function toggleProduct(key) {
    setPermissions(prev => {
      const product = prev[key];
      const def = PRODUCT_PERMISSIONS_DEF[key];
      const newEnabled = !product.enabled;
      return {
        ...prev,
        [key]: {
          enabled: newEnabled,
          addOns: newEnabled
            ? Object.fromEntries(def.addOns.map(a => [a, true]))
            : Object.fromEntries(def.addOns.map(a => [a, false])),
        },
      };
    });
  }

  function toggleAllAddOns(key) {
    setPermissions(prev => {
      const def = PRODUCT_PERMISSIONS_DEF[key];
      const product = prev[key];
      const allChecked = def.addOns.every(a => product.addOns[a]);
      const someChecked = def.addOns.some(a => product.addOns[a]);
      // all → uncheck all; some or none → check all
      const nextAll = !allChecked;
      return {
        ...prev,
        [key]: {
          enabled: true, // keep enabled when toggling add-ons
          addOns: Object.fromEntries(def.addOns.map(a => [a, nextAll])),
        },
      };
    });
  }

  function toggleAddOn(key, addon) {
    setPermissions(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        addOns: { ...prev[key].addOns, [addon]: !prev[key].addOns[addon] },
      },
    }));
  }

  function countEnabledProducts() {
    return Object.values(permissions).filter(p => p.enabled).length;
  }

  if (step === 3) {
    const enabledCount = countEnabledProducts();
    return (
      <ConfirmationHub
        title={`${label} Added`}
        subtitle={`${partnerName} has been created and can now provision ${enabledCount} product${enabledCount !== 1 ? 's' : ''}`}
        onClose={onClose}
        actions={[
          {
            label: `Add Another ${label}`,
            onClick: () => {
              form.reset();
              setPermissions(defaultPermissions());
              setStep(1);
            },
          },
          {
            label: `View ${label}`,
            onClick: () => {
              onSuccess(`${partnerName} has been added`);
              onClose();
            },
          },
          {
            label: 'Go to Customer List',
            onClick: () => {
              onSuccess(`${partnerName} has been added`);
              onClose();
            },
          },
        ]}
      />
    );
  }

  if (step === 2) {
    return (
      <ModalShell
        title="Select Products"
        subtitle={`Choose the products ${partnerName} is permitted to provision`}
        onClose={onClose}
        footer={
          <>
            <BackButton onClick={() => setStep(1)} />
            <div className="flex items-center gap-3">
              <CancelButton onClick={onClose} />
              <PrimaryButton onClick={() => setStep(3)}>
                Save {label}
              </PrimaryButton>
            </div>
          </>
        }
      >
        <div className="px-6 pt-5 pb-6 space-y-5">
          {Object.entries(PRODUCT_PERMISSIONS_DEF).map(([key, def]) => {
            const product = permissions[key];
            const allAddOnsChecked = def.addOns.length > 0 && def.addOns.every(a => product.addOns[a]);
            const someAddOnsChecked = def.addOns.some(a => product.addOns[a]);

            return (
              <div key={key} className={`rounded-lg border p-4 transition-colors ${product.enabled ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/30' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 opacity-60'}`}>
                {/* Product toggle */}
                <TriStateCheckbox
                  checked={product.enabled}
                  indeterminate={false}
                  onChange={() => toggleProduct(key)}
                  label={def.name}
                  Icon={def.Icon}
                  iconColor={def.iconColor}
                />

                {/* Add-ons */}
                {def.addOns.length > 0 && product.enabled && (
                  <div className="mt-3 ml-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Add-ons</span>
                      <button
                        onClick={() => toggleAllAddOns(key)}
                        className="text-[11px] text-azure-600 hover:text-azure-700 cursor-pointer"
                      >
                        {allAddOnsChecked ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {def.addOns.map(addon => (
                        <label key={addon} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={!!product.addOns[addon]}
                            onChange={() => toggleAddOn(key, addon)}
                            className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 accent-blue-600 cursor-pointer"
                          />
                          <span className="text-xs text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200">{addon}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ModalShell>
    );
  }

  // Step 1: partner info
  return (
    <ModalShell
      title={`Add ${label}`}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <PrimaryButton onClick={() => { if (form.validate(RESELLER_REQUIRED)) setStep(2); }} disabled={!formIsValid}>
            Next
          </PrimaryButton>
        </>
      }
    >
      <div className="px-6 pt-5 pb-6 space-y-4">
        <SectionLabel>Company Information</SectionLabel>

        <FormField label="Company Name" error={form.touched.companyName && form.errors.companyName}>
          <FormInput value={form.data.companyName} onChange={e => form.set('companyName', e.target.value)} onBlur={() => form.blur('companyName')} error={form.touched.companyName && form.errors.companyName} placeholder="Legal company name" />
        </FormField>
        <FormField label="Address" error={form.touched.address && form.errors.address}>
          <FormInput value={form.data.address} onChange={e => form.set('address', e.target.value)} onBlur={() => form.blur('address')} error={form.touched.address && form.errors.address} placeholder="Street address" />
        </FormField>
        <FormField label="Address 2" optional>
          <FormInput value={form.data.address2} onChange={e => form.set('address2', e.target.value)} placeholder="Suite, unit, floor…" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="City" error={form.touched.city && form.errors.city}>
            <FormInput value={form.data.city} onChange={e => form.set('city', e.target.value)} onBlur={() => form.blur('city')} error={form.touched.city && form.errors.city} placeholder="City" />
          </FormField>
          <FormField label="State / Province" error={form.touched.stateProvince && form.errors.stateProvince}>
            <FormInput value={form.data.stateProvince} onChange={e => form.set('stateProvince', e.target.value)} onBlur={() => form.blur('stateProvince')} error={form.touched.stateProvince && form.errors.stateProvince} placeholder="State or province" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="ZIP / Postal Code" error={form.touched.zip && form.errors.zip}>
            <FormInput value={form.data.zip} onChange={e => form.set('zip', e.target.value)} onBlur={() => form.blur('zip')} error={form.touched.zip && form.errors.zip} placeholder="ZIP or postal code" />
          </FormField>
          <FormField label="Country" error={form.touched.country && form.errors.country}>
            <FormSelect value={form.data.country} onChange={e => form.set('country', e.target.value)} onBlur={() => form.blur('country')} error={form.touched.country && form.errors.country} placeholder="Select country" options={COUNTRIES} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Timezone" error={form.touched.timezone && form.errors.timezone}>
            <FormSelect value={form.data.timezone} onChange={e => form.set('timezone', e.target.value)} onBlur={() => form.blur('timezone')} error={form.touched.timezone && form.errors.timezone} options={TIMEZONES} />
          </FormField>
          <FormField label="Language" error={form.touched.language && form.errors.language}>
            <FormSelect value={form.data.language} onChange={e => form.set('language', e.target.value)} onBlur={() => form.blur('language')} error={form.touched.language && form.errors.language} options={LANGUAGES} />
          </FormField>
        </div>
      </div>
    </ModalShell>
  );
}

function AddResellerFlow({ onClose, onSuccess }) {
  return <AddPartnerFlow entityType="reseller" onClose={onClose} onSuccess={onSuccess} />;
}

function AddDistributorFlow({ onClose, onSuccess }) {
  return <AddPartnerFlow entityType="distributor" onClose={onClose} onSuccess={onSuccess} />;
}

// ── Success Toast ──────────────────────────────────────────────────────────────

export function SuccessToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-5 right-5 z-[400] animate-palette-in">
      <div className="flex items-center gap-3 pl-0 pr-4 py-3 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 border-l-4 border-l-emerald-500 max-w-sm">
        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-4" />
        <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{message}</span>
        <button
          onClick={onDismiss}
          className="ml-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ProvisioningModal({ type: initialType, contextEntity, availableTypes, onClose, onSuccess }) {
  const [activeType, setActiveType] = useState(initialType);
  const [activeCustomerName, setActiveCustomerName] = useState(
    contextEntity?.name ?? null
  );
  const existingProductKeys = contextEntity
    ? Object.keys(contextEntity.products || {})
    : [];

  function switchToProduct(customerName) {
    setActiveCustomerName(customerName);
    setActiveType('addProduct');
  }

  function handleTypeSelect(type) {
    setActiveType('add' + type.charAt(0).toUpperCase() + type.slice(1));
  }

  if (activeType === 'select') {
    return (
      <TypeSelectionStep
        availableTypes={availableTypes || ['customer']}
        onSelect={handleTypeSelect}
        onClose={onClose}
      />
    );
  }

  if (activeType === 'addCustomer') {
    return (
      <AddCustomerFlow
        onClose={onClose}
        onSuccess={onSuccess}
        onSwitchToProduct={switchToProduct}
      />
    );
  }

  if (activeType === 'addProduct') {
    return (
      <AddProductFlow
        onClose={onClose}
        onSuccess={onSuccess}
        customerName={activeCustomerName}
        existingProductKeys={existingProductKeys}
      />
    );
  }

  if (activeType === 'addReseller') {
    return (
      <AddResellerFlow
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  if (activeType === 'addDistributor') {
    return (
      <AddDistributorFlow
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  return null;
}
