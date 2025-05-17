import { useState, useEffect } from 'react'
import Header from './components/Header'
import CompanyTable from './components/CompanyTable'
import Footer from './components/Footer'

function App() {
  const [companies, setCompanies] = useState([])
  const [filteredCompanies, setFilteredCompanies] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch companies when component mounts
    const fetchCompanies = async () => {
      try {
        // Use the absolute API URL to avoid issues with CORS and proxies
        const API_URL = 'http://localhost:5000';
        
        const response = await fetch(`${API_URL}/api/companies`)
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('API data:', data);
        
        // Process the data
        const formattedCompanies = data.map(company => ({
          name: company.name,
          votes: company.votes || company.rank || 0,
          rank: company.rank || company.votes || 0,
          website: company.website,
          description: company.description,
          short_description: company.short_description || company.description,
          founders: company.founders || [],
          companyId: company.name.replace(/\s+/g, ''),
          website_url: company.website,
          company_linkedin: company.company_linkedin,
          founded_year: company.founded_year,
          location: company.location
        }))
        
        setCompanies(formattedCompanies)
        setFilteredCompanies(formattedCompanies)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching companies:', error)
        setIsLoading(false)
      }
    }
    
    fetchCompanies()
  }, [])
  
  // Filter companies based on search term
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredCompanies(companies)
    } else {
      const filtered = companies.filter(company => {
        const nameMatch = company.name.toLowerCase().includes(searchTerm.toLowerCase())
        const founderMatch = company.founders.some(founder => 
          founder.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        const descriptionMatch = company.description.toLowerCase().includes(searchTerm.toLowerCase())
        
        return nameMatch || founderMatch || descriptionMatch
      })
      setFilteredCompanies(filtered)
    }
  }, [searchTerm, companies])
  
  // Handler for search input changes
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        searchTerm={searchTerm} 
        handleSearchChange={handleSearchChange}
        companyCount={{
          total: companies.length,
          filtered: filteredCompanies.length
        }}
      />
      
      <main className="flex-grow max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue"></div>
          </div>
        ) : (
          <CompanyTable 
            companies={filteredCompanies} 
            setCompanies={setCompanies}
          />
        )}
      </main>
      
      <Footer />
    </div>
  )
}

export default App