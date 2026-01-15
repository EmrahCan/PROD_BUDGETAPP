import { BANKS } from "@/types/bank";

interface BankLogoProps {
  bankId: string;
  bankName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Bank logo URLs - using official bank logos
const BANK_LOGOS: Record<string, string> = {
  // Turkish Public Banks
  ziraat: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/T.C._Ziraat_Bankas%C4%B1_logo.svg/200px-T.C._Ziraat_Bankas%C4%B1_logo.svg.png',
  halkbank: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Halkbank_logo.svg/200px-Halkbank_logo.svg.png',
  vakifbank: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/VakifBank_logo.svg/200px-VakifBank_logo.svg.png',
  
  // Turkish Private Banks
  akbank: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Akbank_logo.svg/200px-Akbank_logo.svg.png',
  garanti: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Garanti_BBVA_logo.svg/200px-Garanti_BBVA_logo.svg.png',
  isbank: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/T%C3%BCrkiye_%C4%B0%C5%9F_Bankas%C4%B1_logo.svg/200px-T%C3%BCrkiye_%C4%B0%C5%9F_Bankas%C4%B1_logo.svg.png',
  yapikredi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Yap%C4%B1_Kredi_logo.svg/200px-Yap%C4%B1_Kredi_logo.svg.png',
  qnb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/QNB_Finansbank_logo.svg/200px-QNB_Finansbank_logo.svg.png',
  denizbank: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/DenizBank_logo.svg/200px-DenizBank_logo.svg.png',
  
  // Turkish Participation Banks
  albaraka: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Albaraka_T%C3%BCrk_logo.svg/200px-Albaraka_T%C3%BCrk_logo.svg.png',
  kuveytturk: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Kuveyt_T%C3%BCrk_logo.svg/200px-Kuveyt_T%C3%BCrk_logo.svg.png',
  turkiyefinans: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/T%C3%BCrkiye_Finans_logo.svg/200px-T%C3%BCrkiye_Finans_logo.svg.png',
  
  // Global Banks
  hsbc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/HSBC_logo_%282018%29.svg/200px-HSBC_logo_%282018%29.svg.png',
  citi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Citi.svg/200px-Citi.svg.png',
  standardchartered: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Standard_Chartered_%282021%29.svg/200px-Standard_Chartered_%282021%29.svg.png',
  
  // European Banks
  ing: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/ING_Group_N.V._Logo.svg/200px-ING_Group_N.V._Logo.svg.png',
  bnpparibas: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/BNP_Paribas_logo.svg/200px-BNP_Paribas_logo.svg.png',
  deutschebank: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Deutsche_Bank_logo_without_wordmark.svg/200px-Deutsche_Bank_logo_without_wordmark.svg.png',
  ubs: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/UBS_logo.svg/200px-UBS_logo.svg.png',
  barclays: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Barclays_logo.svg/200px-Barclays_logo.svg.png',
  santander: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Banco_Santander_Logotipo.svg/200px-Banco_Santander_Logotipo.svg.png',
  
  // American Banks
  jpmorgan: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/JPMorgan_Chase.svg/200px-JPMorgan_Chase.svg.png',
  bankofamerica: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Bank_of_America_Logo.svg/200px-Bank_of_America_Logo.svg.png',
  wellsfargo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Wells_Fargo_Bank.svg/200px-Wells_Fargo_Bank.svg.png',
  goldmansachs: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Goldman_Sachs.svg/200px-Goldman_Sachs.svg.png',
  capitalone: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Capital_One_logo.svg/200px-Capital_One_logo.svg.png',
  
  // Digital Banks
  papara: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Papara_Logo.svg/200px-Papara_Logo.svg.png',
  revolut: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Revolut_logo.svg/200px-Revolut_logo.svg.png',
  n26: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/N26_logo.svg/200px-N26_logo.svg.png',
  wise: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Wise_logo.svg/200px-Wise_logo.svg.png',
  monzo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Monzo_logo.svg/200px-Monzo_logo.svg.png',
  nubank: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Nubank_logo_2021.svg/200px-Nubank_logo_2021.svg.png',
};

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const BankLogo = ({ bankId, bankName, size = 'md', className = '' }: BankLogoProps) => {
  const bank = BANKS.find(b => b.id === bankId);
  const logoUrl = BANK_LOGOS[bankId];
  const bankColor = bank?.color || '#666';
  const initials = (bankName || bank?.shortName || bankId).substring(0, 2).toUpperCase();

  if (logoUrl) {
    return (
      <div 
        className={`${sizeClasses[size]} rounded-lg flex items-center justify-center overflow-hidden bg-white p-1 ${className}`}
      >
        <img 
          src={logoUrl} 
          alt={bankName || bank?.name || bankId}
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback to initials on error - using safe DOM manipulation to prevent XSS
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const span = document.createElement('span');
              span.className = 'text-xs font-bold';
              span.style.color = bankColor;
              span.textContent = initials;
              parent.appendChild(span);
            }
          }}
        />
      </div>
    );
  }

  // Fallback to initials with bank color
  return (
    <div 
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center ${className}`}
      style={{ backgroundColor: bankColor + '20' }}
    >
      <span 
        className={`font-bold ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}
        style={{ color: bankColor }}
      >
        {initials}
      </span>
    </div>
  );
};
