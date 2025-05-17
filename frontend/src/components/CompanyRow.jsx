import React, { useState, useRef, useEffect } from 'react'

const CompanyRow = ({ company, companies, setCompanies }) => {
  const [showVoteInput, setShowVoteInput] = useState(false)
  const [voteValue, setVoteValue] = useState(company.votes || company.rank || 0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [hasFlashEffect, setHasFlashEffect] = useState(false)
  const inputRef = useRef(null)

  // Handle clicking on the vote display to show input
  const handleVoteDisplayClick = () => {
    setShowVoteInput(true)
  }

  // Focus the input when it becomes visible
  useEffect(() => {
    if (showVoteInput && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [showVoteInput])

  // Handle vote input changes
  const handleVoteChange = (e) => {
    setVoteValue(parseInt(e.target.value) || 0)
  }

  // Handle Enter key press to submit form
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitVote()
    }
  }

  // Submit vote on blur
  const handleBlur = () => {
    submitVote()
  }

  // Submit vote to API
  const submitVote = async () => {
    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('rank', voteValue)

      const response = await fetch(`/update_rank/${company.name}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update companies state to reflect the new vote count
        setCompanies(prevCompanies => 
          prevCompanies.map(c => 
            c.name === company.name ? { ...c, votes: data.votes } : c
          ).sort((a, b) => b.votes - a.votes)
        )
        
        // Flash effect
        setHasFlashEffect(true)
        setTimeout(() => setHasFlashEffect(false), 500)
      }
    } catch (error) {
      console.error('Error submitting vote:', error)
    } finally {
      setIsUpdating(false)
      setShowVoteInput(false)
    }
  }

  // Handle upvote/downvote
  const handleVote = async (voteType) => {
    setIsUpdating(true)
    try {
      const endpoint = voteType === 'up' ? `/upvote/${company.name}` : `/downvote/${company.name}`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Update companies state to reflect the new vote count
        setCompanies(prevCompanies => 
          prevCompanies.map(c => 
            c.name === company.name ? { ...c, votes: data.votes } : c
          ).sort((a, b) => b.votes - a.votes)
        )
        
        // Update local vote value
        setVoteValue(data.votes)
        
        // Flash effect
        setHasFlashEffect(true)
        setTimeout(() => setHasFlashEffect(false), 500)
      }
    } catch (error) {
      console.error('Error handling vote:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <tr className="company-row">
      <td>
        <div className="flex items-center">
          <div>
            {showVoteInput ? (
              <input
                ref={inputRef}
                type="number"
                style={{ width: '60px' }}
                value={voteValue}
                onChange={handleVoteChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={isUpdating}
              />
            ) : (
              <span 
                className={`font-bold text-xl cursor-pointer ${hasFlashEffect ? 'vote-updated' : ''}`}
                onClick={handleVoteDisplayClick}
                style={{ marginRight: '10px' }}
              >
                {company.votes || company.rank || 0}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px' }}>
            <button 
              onClick={() => handleVote('up')} 
              className="text-gray-400"
              title="Upvote"
              disabled={isUpdating}
            >
              <i className="fas fa-arrow-up"></i>
            </button>
            <button 
              onClick={() => handleVote('down')} 
              className="text-gray-400"
              title="Downvote"
              disabled={isUpdating}
              style={{ marginTop: '4px' }}
            >
              <i className="fas fa-arrow-down"></i>
            </button>
          </div>
        </div>
      </td>
      <td>
        <div>
          <div className="text-sm">
            <a 
              href={company.website} 
              target="_blank" 
              className="text-accent-blue"
            >
              {company.name}
            </a>
          </div>
        </div>
      </td>
      <td>
        <div className="text-xs text-gray-400">
          {company.founders && company.founders.map((founder, index) => (
            <div key={index}>
              <a 
                href={founder.linkedin} 
                target="_blank" 
              >
                {founder.name}
              </a>
            </div>
          ))}
        </div>
      </td>
      <td>
        <div className="text-xs" style={{ maxWidth: '500px' }}>
          {company.short_description || company.description}
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a 
            href={company.website} 
            target="_blank" 
            className="text-gray-400"
          >
            <i className="fas fa-globe" style={{ marginRight: '4px' }}></i> Web
          </a>
          {company.company_linkedin && (
            <a 
              href={company.company_linkedin} 
              target="_blank" 
              className="text-gray-400"
            >
              <i className="fab fa-linkedin" style={{ marginRight: '4px' }}></i> LinkedIn
            </a>
          )}
        </div>
      </td>
    </tr>
  )
}

export default CompanyRow