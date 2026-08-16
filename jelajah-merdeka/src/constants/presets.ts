import { PresetProfile } from '../types';

export const PERMITTED_TARGET_URLS = {
  BLOGSPOT: 'https://mr-merdeka.blogspot.com',
  ABSENSI: 'https://merdeka.infinityfreeapp.com/absen/?i=1',
};

export const PRESET_PROFILES: PresetProfile[] = [
  {
    id: 'mr-merdeka-blog',
    name: 'MR Merdeka Blogspot',
    description: 'Direct locked destination to https://mr-merdeka.blogspot.com. URL is completely hidden with 0 ads and strict isolation.',
    icon: 'Globe',
    targetUrl: 'https://mr-merdeka.blogspot.com',
    allowedDomains: [
      'mr-merdeka.blogspot.com',
      '*.blogspot.com',
      'blogger.com',
      '*.blogger.com',
      '*.googleusercontent.com',
      'merdeka.infinityfreeapp.com',
      '*.infinityfreeapp.com',
    ],
    category: 'Enterprise',
  },
  {
    id: 'merdeka-absensi',
    name: 'Merdeka Absensi Portal',
    description: 'Direct locked destination to https://merdeka.infinityfreeapp.com/absen/?i=1. Dedicated attendance kiosk with hidden URL bar.',
    icon: 'CheckSquare',
    targetUrl: 'https://merdeka.infinityfreeapp.com/absen/?i=1',
    allowedDomains: [
      'merdeka.infinityfreeapp.com',
      '*.infinityfreeapp.com',
      'mr-merdeka.blogspot.com',
      '*.blogspot.com',
      'blogger.com',
      '*.blogger.com',
    ],
    category: 'Custom',
  },
  {
    id: 'dual-authorized',
    name: 'Dual-Authorized Merdeka Kiosk',
    description: 'Multi-authorized sandbox permitting only MR Merdeka Blogspot and Merdeka Absensi Portal with seamless switching.',
    icon: 'ShieldCheck',
    targetUrl: 'https://mr-merdeka.blogspot.com',
    allowedDomains: [
      'mr-merdeka.blogspot.com',
      '*.blogspot.com',
      'blogger.com',
      '*.blogger.com',
      '*.googleusercontent.com',
      'merdeka.infinityfreeapp.com',
      '*.infinityfreeapp.com',
    ],
    category: 'Enterprise',
  },
];

export const COMMON_AD_TRACKER_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'google-analytics.com',
  'adnxs.com',
  'facebook.net',
  'scorecardresearch.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'amazon-adsystem.com',
  'popads.net',
  'adroll.com',
  'adskeeper.co.uk',
  'propellerads.com',
  'analytics.',
  'pixel.',
  'telemetry.',
  '/ad/',
  '/ads/',
  '/advert/',
  '/banner/',
];
