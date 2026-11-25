import React from 'react';
import { ArrowLeft, ArrowRight, Bell, Ban, Briefcase, Building2, Calendar, CalendarCheck, CalendarX, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clock, CreditCard, DollarSign, File, FileText, Gift, Heart, House, IdCard, Info, Mail, MailOpen, MapPin, Minus, Package, Palette, Pencil, Plus, Receipt, Search, Settings, Shirt, SlidersHorizontal, Store, Tag, Trash2, TrendingUp, TriangleAlert, Truck, User, UserCircle, Users, X, RotateCw, Grid2X2 } from 'lucide-react';
const icons = {
  'bx-arrow-back': ArrowLeft, 'bx-arrow-forward': ArrowRight, 'bx-bell': Bell, 'bx-block': Ban,
  'bx-briefcase': Briefcase, 'bx-building': Building2, 'bx-buildings': Building2,
  'bx-calendar': Calendar, 'bx-calendar-check': CalendarCheck, 'bx-calendar-x': CalendarX,
  'bx-category': Grid2X2, 'bx-check-circle': CheckCircle2,
  'bx-chevron-down': ChevronDown, 'bx-chevron-left': ChevronLeft, 'bx-chevron-right': ChevronRight, 'bx-chevron-up': ChevronUp,
  'bx-cog': Settings, 'bx-credit-card': CreditCard, 'bx-customize': SlidersHorizontal,
  'bx-dollar': DollarSign, 'bx-edit': Pencil, 'bx-envelope': Mail, 'bx-envelope-open': MailOpen,
  'bx-error-circle': TriangleAlert, 'bx-file-blank': File, 'bxs-file-pdf': FileText,
  'bx-gift': Gift, 'bx-group': Users, 'bx-heart': Heart, 'bx-home-alt': House, 'bx-id-card': IdCard,
  'bx-info-circle': Info, 'bx-map': MapPin, 'bx-minus': Minus, 'bx-money': DollarSign,
  'bx-package': Package, 'bx-palette': Palette, 'bx-plus': Plus, 'bx-purchase-tag': Tag,
  'bx-receipt': Receipt, 'bx-refresh': RotateCw, 'bx-search': Search, 'bx-store': Store,
  'bx-t-shirt': Shirt, 'bx-tag': Tag, 'bx-time': Clock, 'bx-time-five': Clock,
  'bx-trash': Trash2, 'bx-trending-up': TrendingUp, 'bx-user': User,
  'bx-user-circle': UserCircle, 'bx-user-pin': User, 'bx-x': X, 'bxs-truck': Truck,
  'fa-user': User, 'fa-users': Users, 'fa-check': CheckCircle2, 'fa-envelope': Mail,
  'fa-phone': UserCircle, 'fa-arrow-left': ArrowLeft, 'fa-plus': Plus, 'fa-trash': Trash2
};
export default function UIIcon({ className = '', ...props }) {
  const Icon = String(className).split(/\s+/).map(name => icons[name]).find(Boolean) || Circle;
  return <Icon size={20} strokeWidth={1.7} {...props} className={'ui-icon ' + className} aria-hidden="true" focusable="false" />;
}
