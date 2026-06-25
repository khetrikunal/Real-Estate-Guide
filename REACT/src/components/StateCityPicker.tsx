import { useState, useMemo } from 'react';
import { ArrowLeft, Search, Check, ChevronRight, X } from 'lucide-react';

// Global CSS covers prefers-reduced-motion for class-based UI animation.

/* ═══════════════════════════════════════════════════════
   Comprehensive Indian States → Cities map
   ═══════════════════════════════════════════════════════ */
export const INDIA_STATES_CITIES: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry', 'Kadapa', 'Kakinada', 'Anantapur', 'Eluru', 'Ongole', 'Srikakulam', 'Machilipatnam', 'Tenali', 'Proddatur', 'Chittoor', 'Hindupur', 'Bhimavaram', 'Narasaraopet'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila', 'Along', 'Tezu', 'Roing'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'North Lakhimpur', 'Karimganj'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra', 'Samastipur', 'Hajipur', 'Sasaram', 'Dehri', 'Siwan', 'Motihari', 'Nawada', 'Buxar'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Durg', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Raigarh', 'Jagdalpur', 'Ambikapur', 'Chirmiri', 'Dhamtari', 'Mahasamund'],
  'Goa': ['Panaji', 'Vasco da Gama', 'Margao', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Canacona', 'Quepem', 'Sanguem'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Morbi', 'Nadiad', 'Mehsana', 'Surendranagar', 'Gandhidham', 'Bharuch', 'Navsari', 'Veraval', 'Porbandar', 'Godhra', 'Palanpur', 'Valsad', 'Patan', 'Botad', 'Dahod'],
  'Haryana': ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Palwal', 'Manesar'],
  'Himachal Pradesh': ['Shimla', 'Mandi', 'Dharamshala', 'Solan', 'Nahan', 'Bilaspur', 'Hamirpur', 'Kullu', 'Palampur', 'Baddi', 'Chamba', 'Una', 'Manali', 'Kangra'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Phusro', 'Medininagar', 'Dumka', 'Chaibasa'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davanagere', 'Ballari', 'Vijayapura', 'Shivamogga', 'Tumakuru', 'Raichur', 'Hassan', 'Udupi', 'Chitradurga', 'Mandya', 'Gadag', 'Bidar', 'Ramanagara', 'Chikmagalur'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Palakkad', 'Malappuram', 'Kannur', 'Kottayam', 'Kasaragod', 'Pathanamthitta', 'Idukki', 'Wayanad'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Murwara', 'Singrauli', 'Burhanpur', 'Khandwa', 'Morena', 'Bhind', 'Chhindwara', 'Guna', 'Vidisha', 'Shivpuri', 'Damoh', 'Mandsaur', 'Khargone', 'Neemuch', 'Hoshangabad'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai', 'Sangli', 'Jalgaon', 'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji', 'Jalna', 'Ambernath', 'Bhiwandi', 'Panvel', 'Badlapur', 'Beed', 'Gondia', 'Satara', 'Barshi', 'Yavatmal', 'Achalpur', 'Osmanabad', 'Nandurbar', 'Wardha', 'Baramati', 'Malegaon', 'Kalyan', 'Vasai-Virar', 'Mira-Bhayandar', 'Ulhasnagar'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching'],
  'Meghalaya': ['Shillong', 'Tura', 'Nongstoin', 'Jowai', 'Baghmara', 'Williamnagar'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib', 'Serchhip'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Wokha', 'Tuensang', 'Mon'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Jeypore', 'Bargarh', 'Angul'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur', 'Batala', 'Moga', 'Abohar', 'Malerkotla', 'Khanna', 'Phagwara', 'Muktsar', 'Barnala', 'Rajpura', 'Firozpur', 'Kapurthala', 'Zirakpur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Sikar', 'Sri Ganganagar', 'Pali', 'Bharatpur', 'Tonk', 'Kishangarh', 'Beawar', 'Hanumangarh', 'Nagaur', 'Dhaulpur', 'Barmer', 'Chittorgarh', 'Jhunjhunu', 'Churu', 'Bundi', 'Banswara', 'Dungarpur', 'Sawai Madhopur', 'Mount Abu', 'Pushkar'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Rangpo', 'Singtam'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur', 'Udhagamandalam', 'Hosur', 'Nagercoil', 'Kanchipuram', 'Kumbakonam', 'Rajapalayam', 'Cuddalore', 'Ambur'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Miryalaguda', 'Siddipet', 'Mancherial', 'Kamareddy'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar', 'Belonia', 'Ambassa'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida', 'Firozabad', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Budaun', 'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Ayodhya', 'Mau', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr', 'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Orai', 'Unnao', 'Lakhimpur Kheri', 'Sitapur', 'Bahraich', 'Greater Noida'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital', 'Mussoorie', 'Pithoragarh', 'Almora', 'Pauri', 'Bageshwar', 'Chamoli'],
  'West Bengal': ['Kolkata', 'Howrah', 'Asansol', 'Siliguri', 'Durgapur', 'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur', 'Shantipur', 'Dankuni', 'Dhulian', 'Ranaghat', 'Haldia', 'Raiganj', 'Krishnanagar', 'Nabadwip', 'Medinipur', 'Jalpaiguri', 'Balurghat', 'Basirhat', 'Bankura', 'Jangipur', 'Cooch Behar'],
  'Delhi': ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Janakpuri', 'Pitampura', 'Laxmi Nagar', 'Karol Bagh', 'Saket', 'Vasant Kunj', 'Connaught Place', 'Greater Kailash'],
  'Chandigarh': ['Chandigarh'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Sopore', 'Kathua', 'Poonch', 'Rajouri'],
  'Ladakh': ['Leh', 'Kargil'],
  'Andaman & Nicobar': ['Port Blair'],
  'Dadra & Nagar Haveli and Daman & Diu': ['Silvassa', 'Daman', 'Diu'],
  'Lakshadweep': ['Kavaratti'],
};

export function getIndianStates() {
  return Object.keys(INDIA_STATES_CITIES).sort();
}

export function getIndianCitiesForState(state: string, customCities: string[] = []) {
  const baseCities = INDIA_STATES_CITIES[state] ?? [];
  return Array.from(new Set([...baseCities, ...customCities].map((city) => city.trim()).filter(Boolean))).sort();
}

interface StateCityPickerProps {
  initialState?: string;
  initialCity?: string;
  customCitiesByState?: Record<string, string[]>;
  onSelect: (state: string, city: string) => void;
  onClose?: () => void;
  inline?: boolean;
}

export function StateCityPicker({ initialState, initialCity, customCitiesByState, onSelect, onClose, inline }: StateCityPickerProps) {
  const [step, setStep] = useState<0 | 1>(initialState ? 1 : 0);
  const [selectedState, setSelectedState] = useState(initialState ?? '');
  const [search, setSearch] = useState('');

  const states = useMemo(() => {
    const customStates = Object.keys(customCitiesByState ?? {});
    return Array.from(new Set([...getIndianStates(), ...customStates])).sort();
  }, [customCitiesByState]);

  const cities = useMemo(() => {
    if (!selectedState) return [];
    return getIndianCitiesForState(selectedState, customCitiesByState?.[selectedState] ?? []);
  }, [customCitiesByState, selectedState]);

  const filteredStates = states.filter((s) => s.toLowerCase().includes(search.toLowerCase()));
  const filteredCities = cities.filter((c) => c.toLowerCase().includes(search.toLowerCase()));

  const handleStateSelect = (state: string) => {
    setSelectedState(state);
    setStep(1);
    setSearch('');
  };

  const handleCitySelect = (city: string) => {
    onSelect(selectedState, city);
  };

  const goBack = () => {
    setStep(0);
    setSearch('');
  };

  const Container = inline ? 'div' : 'aside';

  return (
    <Container className={`state-city-picker ${inline ? 'inline' : ''}`}>
      <div className="picker-header">
        {step === 1 && (
          <button className="icon-button small" type="button" onClick={goBack} aria-label="Back">
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h3>{step === 0 ? 'Select State' : 'Select City'}</h3>
          {step === 1 && <p className="eyebrow">{selectedState}</p>}
        </div>
        {onClose && (
          <button className="icon-button small" type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto' }}>
            <X size={16} />
          </button>
        )}
      </div>
      <div className="picker-search">
        <span className="input-shell">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={step === 0 ? 'Search state...' : 'Search city...'}
          />
        </span>
      </div>
      <div className="picker-list">
        {step === 0 ? (
          filteredStates.length === 0 ? (
            <p className="picker-empty">No states found</p>
          ) : (
            filteredStates.map((state) => (
              <button
                key={state}
                type="button"
                className={`picker-item ${state === selectedState ? 'active' : ''}`}
                onClick={() => handleStateSelect(state)}
              >
                <span>{state}</span>
                <ChevronRight size={16} />
              </button>
            ))
          )
        ) : (
          filteredCities.length === 0 ? (
            <p className="picker-empty">No cities found</p>
          ) : (
            filteredCities.map((city) => (
              <button
                key={city}
                type="button"
                className={`picker-item ${city === initialCity ? 'active' : ''}`}
                onClick={() => handleCitySelect(city)}
              >
                <span>{city}</span>
                {city === initialCity && <Check size={16} />}
              </button>
            ))
          )
        )}
      </div>
    </Container>
  );
}
