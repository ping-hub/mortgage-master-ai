
// Simulated API service to fetch latest official rates
// In a real app, this would fetch from a backend or 3rd party financial API

export interface OfficialRates {
  lpr5y: number; // Commercial 5-year+ LPR
  provident5y: number; // Provident Fund 5-year+
  lastUpdated: string;
}

export const fetchOfficialRates = (): Promise<OfficialRates> => {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      resolve({
        lpr5y: 3.60, // Current 5-year LPR (Reference)
        provident5y: 2.85, // Current Provident Fund Rate > 5y
        lastUpdated: new Date().toLocaleDateString()
      });
    }, 800);
  });
};