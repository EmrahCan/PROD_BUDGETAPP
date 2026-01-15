export interface Bank {
  id: string;
  name: string;
  shortName: string;
  color: string;
  category: 'turkish_public' | 'turkish_private' | 'turkish_participation' | 'global' | 'european' | 'american' | 'asian' | 'digital' | 'custom';
  logo?: string;
}

export const BANKS: Bank[] = [
  // Turkish Public Banks
  {
    id: 'ziraat',
    name: 'Ziraat Bankası',
    shortName: 'Ziraat',
    color: '#00632B',
    category: 'turkish_public',
  },
  {
    id: 'halkbank',
    name: 'Halkbank',
    shortName: 'Halkbank',
    color: '#E30613',
    category: 'turkish_public',
  },
  {
    id: 'vakifbank',
    name: 'VakıfBank',
    shortName: 'VakıfBank',
    color: '#005DAA',
    category: 'turkish_public',
  },
  
  // Turkish Private Banks
  {
    id: 'akbank',
    name: 'Akbank',
    shortName: 'Akbank',
    color: '#ED1C24',
    category: 'turkish_private',
  },
  {
    id: 'garanti',
    name: 'Garanti BBVA',
    shortName: 'Garanti',
    color: '#00A950',
    category: 'turkish_private',
  },
  {
    id: 'isbank',
    name: 'İş Bankası',
    shortName: 'İş Bankası',
    color: '#FF6600',
    category: 'turkish_private',
  },
  {
    id: 'yapikredi',
    name: 'Yapı Kredi',
    shortName: 'Yapı Kredi',
    color: '#003D7A',
    category: 'turkish_private',
  },
  {
    id: 'qnb',
    name: 'QNB Finansbank',
    shortName: 'QNB',
    color: '#7E1946',
    category: 'turkish_private',
  },
  {
    id: 'denizbank',
    name: 'Denizbank',
    shortName: 'Denizbank',
    color: '#00A651',
    category: 'turkish_private',
  },
  
  // Turkish Participation Banks
  {
    id: 'albaraka',
    name: 'Albaraka Türk',
    shortName: 'Albaraka',
    color: '#00843D',
    category: 'turkish_participation',
  },
  {
    id: 'kuveytturk',
    name: 'Kuveyt Türk',
    shortName: 'Kuveyt Türk',
    color: '#006341',
    category: 'turkish_participation',
  },
  {
    id: 'turkiyefinans',
    name: 'Türkiye Finans',
    shortName: 'Türkiye Finans',
    color: '#C6007E',
    category: 'turkish_participation',
  },
  
  // Global Banks
  {
    id: 'hsbc',
    name: 'HSBC',
    shortName: 'HSBC',
    color: '#DB0011',
    category: 'global',
  },
  {
    id: 'citi',
    name: 'Citibank',
    shortName: 'Citi',
    color: '#003B70',
    category: 'global',
  },
  {
    id: 'standardchartered',
    name: 'Standard Chartered',
    shortName: 'StanChart',
    color: '#0066B3',
    category: 'global',
  },
  
  // European Banks
  {
    id: 'ing',
    name: 'ING Bank',
    shortName: 'ING',
    color: '#FF6200',
    category: 'european',
  },
  {
    id: 'bnpparibas',
    name: 'BNP Paribas',
    shortName: 'BNP',
    color: '#00915A',
    category: 'european',
  },
  {
    id: 'deutschebank',
    name: 'Deutsche Bank',
    shortName: 'Deutsche',
    color: '#0018A8',
    category: 'european',
  },
  {
    id: 'ubs',
    name: 'UBS',
    shortName: 'UBS',
    color: '#E60000',
    category: 'european',
  },
  {
    id: 'creditsuisse',
    name: 'Credit Suisse',
    shortName: 'CS',
    color: '#003366',
    category: 'european',
  },
  {
    id: 'barclays',
    name: 'Barclays',
    shortName: 'Barclays',
    color: '#00AEEF',
    category: 'european',
  },
  {
    id: 'santander',
    name: 'Santander',
    shortName: 'Santander',
    color: '#EC0000',
    category: 'european',
  },
  {
    id: 'unicredit',
    name: 'UniCredit',
    shortName: 'UniCredit',
    color: '#D10019',
    category: 'european',
  },
  {
    id: 'commerzbank',
    name: 'Commerzbank',
    shortName: 'Commerz',
    color: '#FFCC00',
    category: 'european',
  },
  {
    id: 'rabobank',
    name: 'Rabobank',
    shortName: 'Rabobank',
    color: '#F07F09',
    category: 'european',
  },
  
  // American Banks
  {
    id: 'jpmorgan',
    name: 'JPMorgan Chase',
    shortName: 'JPMorgan',
    color: '#117ACA',
    category: 'american',
  },
  {
    id: 'bankofamerica',
    name: 'Bank of America',
    shortName: 'BoA',
    color: '#E31837',
    category: 'american',
  },
  {
    id: 'wellsfargo',
    name: 'Wells Fargo',
    shortName: 'Wells Fargo',
    color: '#D71E28',
    category: 'american',
  },
  {
    id: 'goldmansachs',
    name: 'Goldman Sachs',
    shortName: 'Goldman',
    color: '#6F9FD8',
    category: 'american',
  },
  {
    id: 'morganstanley',
    name: 'Morgan Stanley',
    shortName: 'Morgan S',
    color: '#002D72',
    category: 'american',
  },
  {
    id: 'capitalone',
    name: 'Capital One',
    shortName: 'Capital One',
    color: '#D03027',
    category: 'american',
  },
  {
    id: 'usbank',
    name: 'U.S. Bank',
    shortName: 'US Bank',
    color: '#0C2074',
    category: 'american',
  },
  {
    id: 'pnc',
    name: 'PNC Bank',
    shortName: 'PNC',
    color: '#F68B1F',
    category: 'american',
  },
  {
    id: 'charlesschwab',
    name: 'Charles Schwab',
    shortName: 'Schwab',
    color: '#00A3E0',
    category: 'american',
  },
  
  // Asian Banks
  {
    id: 'icbc',
    name: 'ICBC',
    shortName: 'ICBC',
    color: '#C8102E',
    category: 'asian',
  },
  {
    id: 'bankofchina',
    name: 'Bank of China',
    shortName: 'BoC',
    color: '#C8102E',
    category: 'asian',
  },
  {
    id: 'ccb',
    name: 'China Construction Bank',
    shortName: 'CCB',
    color: '#0066B3',
    category: 'asian',
  },
  {
    id: 'mufg',
    name: 'MUFG Bank',
    shortName: 'MUFG',
    color: '#E60012',
    category: 'asian',
  },
  {
    id: 'mizuho',
    name: 'Mizuho Bank',
    shortName: 'Mizuho',
    color: '#1E3C87',
    category: 'asian',
  },
  {
    id: 'smbc',
    name: 'Sumitomo Mitsui',
    shortName: 'SMBC',
    color: '#00A040',
    category: 'asian',
  },
  {
    id: 'dbs',
    name: 'DBS Bank',
    shortName: 'DBS',
    color: '#E31837',
    category: 'asian',
  },
  {
    id: 'ocbc',
    name: 'OCBC Bank',
    shortName: 'OCBC',
    color: '#D51920',
    category: 'asian',
  },
  {
    id: 'uob',
    name: 'UOB Bank',
    shortName: 'UOB',
    color: '#005BAC',
    category: 'asian',
  },
  
  // Digital Banks
  {
    id: 'papara',
    name: 'Papara',
    shortName: 'Papara',
    color: '#6B3FA0',
    category: 'digital',
  },
  {
    id: 'ininal',
    name: 'İninal',
    shortName: 'İninal',
    color: '#FF6B00',
    category: 'digital',
  },
  {
    id: 'revolut',
    name: 'Revolut',
    shortName: 'Revolut',
    color: '#0075EB',
    category: 'digital',
  },
  {
    id: 'n26',
    name: 'N26',
    shortName: 'N26',
    color: '#36A18B',
    category: 'digital',
  },
  {
    id: 'wise',
    name: 'Wise (TransferWise)',
    shortName: 'Wise',
    color: '#00B9FF',
    category: 'digital',
  },
  {
    id: 'monzo',
    name: 'Monzo',
    shortName: 'Monzo',
    color: '#FF4C4C',
    category: 'digital',
  },
  {
    id: 'chime',
    name: 'Chime',
    shortName: 'Chime',
    color: '#1EC677',
    category: 'digital',
  },
  {
    id: 'nubank',
    name: 'Nubank',
    shortName: 'Nubank',
    color: '#820AD1',
    category: 'digital',
  },
];

// For backwards compatibility
export const TURKISH_BANKS = BANKS;

export const BANK_CATEGORIES = {
  turkish_public: 'Türk Kamu Bankaları',
  turkish_private: 'Türk Özel Bankaları',
  turkish_participation: 'Türk Katılım Bankaları',
  global: 'Küresel Bankalar',
  european: 'Avrupa Bankaları',
  american: 'Amerika Bankaları',
  asian: 'Asya Bankaları',
  digital: 'Dijital Bankalar',
  custom: 'Özel Bankalar',
} as const;

export const BANK_CATEGORIES_EN = {
  turkish_public: 'Turkish Public Banks',
  turkish_private: 'Turkish Private Banks',
  turkish_participation: 'Turkish Participation Banks',
  global: 'Global Banks',
  european: 'European Banks',
  american: 'American Banks',
  asian: 'Asian Banks',
  digital: 'Digital Banks',
  custom: 'Custom Banks',
} as const;

export const BANK_CATEGORIES_DE = {
  turkish_public: 'Türkische Staatsbanken',
  turkish_private: 'Türkische Privatbanken',
  turkish_participation: 'Türkische Beteiligungsbanken',
  global: 'Globale Banken',
  european: 'Europäische Banken',
  american: 'Amerikanische Banken',
  asian: 'Asiatische Banken',
  digital: 'Digitalbanken',
  custom: 'Eigene Banken',
} as const;

// Color palette for custom banks
export const CUSTOM_BANK_COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB',
  '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047',
  '#7CB342', '#C0CA33', '#FDD835', '#FFB300', '#FB8C00',
  '#F4511E', '#6D4C41', '#757575', '#546E7A', '#2196F3',
];
