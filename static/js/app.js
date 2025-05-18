// Function to handle ranking through AJAX
async function handleRank(companyId, rankType) {
    try {
        // Get the current rank element
        const rankDisplayElement = document.getElementById(`rankDisplay${companyId}`);
        if (!rankDisplayElement) {
            console.error('Could not find rank display element', companyId);
            return;
        }
        
        // Get current rank value
        const currentRank = parseInt(rankDisplayElement.textContent || '0', 10);
        
        // Update UI immediately for responsive feel (optimistic update)
        // For ranking, "promote" means decreasing the number (better rank), "demote" means increasing
        let newRank;
        if (rankType === 'promote') {
            // Don't allow rank below 1 (1 is the highest rank)
            newRank = Math.max(1, currentRank - 1);
        } else {
            // For demote, increase the rank number
            newRank = currentRank + 1;
        }
        
        // If the optimistic update didn't change anything, don't continue
        if (newRank === currentRank) {
            // Can't promote any higher than 1
            if (rankType === 'promote') {
                rankDisplayElement.classList.add('vote-updated');
                setTimeout(() => {
                    rankDisplayElement.classList.remove('vote-updated');
                }, 500);
            }
            return;
        }
        
        // Update the display right away
        rankDisplayElement.textContent = newRank;
        
        // Show feedback animation right away
        rankDisplayElement.classList.add('vote-updated');
        setTimeout(() => {
            rankDisplayElement.classList.remove('vote-updated');
        }, 500);
        
        // Determine the endpoint based on rank change type
        const endpoint = `/update_rank/${companyId}`;
        
        // Make API call using form submission
        const formData = new FormData();
        formData.append('rank', newRank);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            body: formData
        });
        
        if (response.ok) {
            try {
                // Get the actual updated rank from server
                const data = await response.json();
                
                // Update to server value (only if different from our optimistic update)
                if (data.rank !== newRank) {
                    rankDisplayElement.textContent = data.rank;
                }
                
                // Update local data
                const companyIndex = allCompaniesData.findIndex(c => c.id === parseInt(companyId));
                if (companyIndex !== -1) {
                    allCompaniesData[companyIndex].rank = data.rank;
                    allCompaniesData[companyIndex].votes = data.rank; // Ensure both fields are updated
                }
                
                // Re-sort and redraw the table without full data refresh from server
                const searchQuery = document.getElementById('searchInput')?.value || '';
                const tagFilter = document.getElementById('tagFilterSelect')?.value || '';
                const tierFilter = document.getElementById('tierFilterSelect')?.value || '';
                searchAndFilterCompanies(searchQuery, tagFilter, tierFilter);
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                // Keep the optimistic update
            }
        } else {
            // If there was an error, rollback to original value
            console.error('Error updating rank:', response.statusText);
            rankDisplayElement.textContent = currentRank;
            
            // Show error indicator
            rankDisplayElement.classList.add('vote-error');
            setTimeout(() => {
                rankDisplayElement.classList.remove('vote-error');
            }, 500);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Show vote input when clicking on vote display
function showVoteInput(companyId) {
    const displayElem = document.getElementById(`rankDisplay${companyId}`);
    const inputContainer = document.getElementById(`rankInputContainer${companyId}`);
    const inputElem = document.getElementById(`rankInput${companyId}`);
    
    if (displayElem && inputContainer && inputElem) {
        displayElem.classList.add('hidden');
        inputContainer.classList.remove('hidden');
        inputElem.focus();
        inputElem.select();
    }
}

// Handle Enter key in vote input
function handleEnterKey(event, companyId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        submitVote(companyId);
    }
}

// Handle blur event on vote input
function handleVoteBlur(companyId) {
    submitVote(companyId);
}

// Function to submit vote/rank update
async function submitVote(companyId) {
    try {
        const rankInput = document.getElementById(`rankInput${companyId}`);
        const rankDisplay = document.getElementById(`rankDisplay${companyId}`);
        const inputContainer = document.getElementById(`rankInputContainer${companyId}`);
        
        if (!rankInput || !rankDisplay || !inputContainer) {
            console.error('Could not find rank elements for company', companyId);
            return;
        }
        
        let rankValue = parseInt(rankInput.value, 10);
        
        // Ensure rank is at least 1 (1 is the highest rank)
        if (isNaN(rankValue) || rankValue < 1) {
            rankValue = 1;
        }
        
        // Update display immediately (optimistic update)
        rankDisplay.textContent = rankValue;
        
        // Hide input, show display
        rankDisplay.classList.remove('hidden');
        inputContainer.classList.add('hidden');
        
        // Visual feedback for update
        rankDisplay.style.transition = 'background-color 0.3s';
        rankDisplay.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
        setTimeout(() => {
            rankDisplay.style.backgroundColor = 'transparent';
        }, 500);
        
        // Make API call in background
        const response = await fetch(`/update_rank/${companyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: `rank=${rankValue}`
        });
        
        if (response.ok) {
            // Get updated data
            const data = await response.json();
            
            // Update local data
            const companyIndex = allCompaniesData.findIndex(c => c.id === parseInt(companyId));
            if (companyIndex !== -1) {
                allCompaniesData[companyIndex].rank = data.rank;
            }
            
            // Re-sort the table without full refresh
            const searchQuery = document.getElementById('searchInput')?.value || '';
            const tagFilter = document.getElementById('tagFilterSelect')?.value || '';
            const tierFilter = document.getElementById('tierFilterSelect')?.value || '';
            searchAndFilterCompanies(searchQuery, tagFilter, tierFilter);
        } else {
            console.error('Error updating rank:', response.statusText);
            // Visual feedback for error
            rankDisplay.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
            setTimeout(() => {
                rankDisplay.style.backgroundColor = 'transparent';
            }, 500);
        }
    } catch (error) {
        console.error('Error updating rank:', error);
    }
}

// Function to handle tier changes using AJAX
async function handleTierChange(companyId, tier) {
    try {
        // Get the select element
        const tierSelect = document.getElementById(`tierSelect${companyId}`);
        
        // Store original tier value in case of error
        const originalTier = tierSelect.getAttribute('data-original-tier') || tier;
        
        // Apply visual feedback
        tierSelect.classList.add('bg-accent-blue');
        setTimeout(() => {
            tierSelect.classList.remove('bg-accent-blue');
        }, 500);
        
        // Make API call to update tier
        const response = await fetch(`/update_tier/${companyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: `tier=${tier}`
        });
        
        if (response.ok) {
            // Get updated data
            const data = await response.json();
            
            // Store the new tier as the original for future reference
            tierSelect.setAttribute('data-original-tier', data.tier);
            
            // Update local data instead of fetching everything again
            const companyIndex = allCompaniesData.findIndex(c => c.id === parseInt(companyId));
            if (companyIndex !== -1) {
                allCompaniesData[companyIndex].tier = data.tier;
            }
            
            // Re-apply current filters without full data refresh
            const searchQuery = document.getElementById('searchInput')?.value || '';
            const tagFilter = document.getElementById('tagFilterSelect')?.value || '';
            const tierFilter = document.getElementById('tierFilterSelect')?.value || '';
            searchAndFilterCompanies(searchQuery, tagFilter, tierFilter);
        } else {
            console.error('Error updating tier:', response.statusText);
            
            // Revert to original tier
            tierSelect.value = originalTier;
            
            // Show error
            tierSelect.classList.add('bg-accent-red');
            setTimeout(() => {
                tierSelect.classList.remove('bg-accent-red');
            }, 500);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Collect all unique tags from all companies
function collectAllTags(companies) {
    const tagSet = new Set();
    companies.forEach(company => {
        if (company.tags && Array.isArray(company.tags)) {
            company.tags.forEach(tag => tagSet.add(tag));
        }
    });
    return Array.from(tagSet).sort();
}

// Update tag filter dropdown with all available tags
function updateTagFilterOptions(tags) {
    const tagFilterSelect = document.getElementById('tagFilterSelect');
    if (!tagFilterSelect) return;
    
    // Clear existing options (except the first one)
    while (tagFilterSelect.options.length > 1) {
        tagFilterSelect.remove(1);
    }
    
    // Add options for each tag
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilterSelect.appendChild(option);
    });
    
    console.log('Updated tag filter dropdown with', tags.length, 'tags');
}

// Add a tag to a company
async function addTag(companyId, tagText) {
    try {
        if (!tagText || !tagText.trim()) return;
        
        // Submit the new tag to the server
        const formData = new FormData();
        formData.append('tag', tagText);
        
        const response = await fetch(`/add_tag/${companyId}`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Reload all companies data to get the updated tags
                await loadAllCompaniesData();
                
                // Update the tag dropdown with new tags
                const allTags = collectAllTags(allCompaniesData);
                updateTagFilterOptions(allTags);
                
                // Reapply current filters
                const searchQuery = document.getElementById('searchInput')?.value || '';
                const tagFilter = document.getElementById('tagFilterSelect')?.value || '';
                const tierFilter = document.getElementById('tierFilterSelect')?.value || '';
                searchAndFilterCompanies(searchQuery, tagFilter, tierFilter);
            }
        }
    } catch (error) {
        console.error('Error adding tag:', error);
    }
}

// Remove a tag from a company
async function removeTag(companyId, tagIndex) {
    try {
        const response = await fetch(`/remove_tag/${companyId}/${tagIndex}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Reload all companies data to get the updated tags
                await loadAllCompaniesData();
                
                // Update the tag dropdown with current tags
                const allTags = collectAllTags(allCompaniesData);
                updateTagFilterOptions(allTags);
                
                // Reapply current filters
                const searchQuery = document.getElementById('searchInput')?.value || '';
                const tagFilter = document.getElementById('tagFilterSelect')?.value || '';
                const tierFilter = document.getElementById('tierFilterSelect')?.value || '';
                searchAndFilterCompanies(searchQuery, tagFilter, tierFilter);
            }
        }
    } catch (error) {
        console.error('Error removing tag:', error);
    }
}

// Store all companies data in memory for client-side filtering
let allCompaniesData = [];

/**
 * Renders company rows in the table - this function is needed by other parts of the code
 * @param {Array} companies - Array of company objects to render
 * @param {HTMLElement} tableBody - The table body element to render into
 */
function renderCompanyRows(companies, tableBody) {
    if (!tableBody) return;
    
    // Clear the table body
    tableBody.innerHTML = '';
    
    // Handle empty results
    if (companies.length === 0) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = '<td colspan="5" class="px-3 py-5 text-center text-gray-400">No companies match your search criteria</td>';
        tableBody.appendChild(noResultsRow);
        return;
    }
    
    // Add each company to the table
    companies.forEach(company => {
        const row = document.createElement('tr');
        row.className = 'company-row border-b border-dark-border';
        row.dataset.companyId = company.id;
        
        // Create the HTML for the row
        row.innerHTML = `
            <td class="px-2 py-2 whitespace-nowrap">
                <div class="flex items-center space-x-1">
                    <div class="flex items-center flex-col md:flex-row space-y-1 md:space-y-0 md:space-x-2">
                        <!-- Tier dropdown -->
                        <div class="flex items-center">
                            <select id="tierSelect${company.id}" data-company-id="${company.id}" data-original-tier="${company.tier}" class="text-sm w-12 px-1 py-1 bg-dark-accent text-gray-200 border border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue" onchange="handleTierChange(${company.id}, this.value)">
                                <option value="A" ${company.tier === 'A' ? 'selected' : ''}>A</option>
                                <option value="B" ${company.tier === 'B' ? 'selected' : ''}>B</option>
                                <option value="C" ${company.tier === 'C' ? 'selected' : ''}>C</option>
                                <option value="D" ${company.tier === 'D' ? 'selected' : ''}>D</option>
                            </select>
                            <span class="mx-2 text-gray-500">/</span>
                        </div>
                        
                        <!-- Rank controls -->
                        <div class="flex items-center">
                            <div id="rankInputContainer${company.id}" class="hidden">
                                <input type="number" id="rankInput${company.id}" min="1" class="vote-input w-16 text-sm px-2 py-1 bg-dark-accent text-gray-200 border border-accent-blue rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue" value="${company.rank}" onblur="handleVoteBlur(${company.id})" onkeydown="handleEnterKey(event, ${company.id})">
                            </div>
                            <span id="rankDisplay${company.id}" class="font-semibold text-xl text-gray-200 cursor-pointer hover:text-accent-blue transition-colors duration-200" onclick="showVoteInput(${company.id})">${company.rank}</span>
                        
                            <div class="flex flex-col space-y-1 ml-2">
                                <button onclick="handleRank(${company.id}, 'promote')" class="text-gray-400 hover:text-accent-green focus:outline-none transition-colors duration-200" title="Promote (Lower Rank Number)">
                                    <i class="fas fa-arrow-up text-sm"></i>
                                </button>
                                <button onclick="handleRank(${company.id}, 'demote')" class="text-gray-400 hover:text-accent-red focus:outline-none transition-colors duration-200" title="Demote (Higher Rank Number)">
                                    <i class="fas fa-arrow-down text-sm"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-2 py-2 whitespace-nowrap">
                <div class="flex flex-col">
                    <div class="flex items-center">
                        <a href="${company.website}" target="_blank" class="text-accent-blue hover:text-blue-400 transition-colors duration-200 text-sm font-medium">
                            ${company.name}
                        </a>
                        ${company.company_linkedin ? `
                        <a href="${company.company_linkedin}" target="_blank" class="ml-1 text-blue-500 hover:text-blue-400 transition-colors duration-200 flex-shrink-0">
                            <span class="bg-blue-900 text-blue-100 px-1 py-0 rounded text-xs font-semibold">LinkedIn</span>
                        </a>
                        ` : ''}
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5">${company.short_description || ''}</div>
                </div>
            </td>

            <td class="px-2 py-2 whitespace-nowrap">
                <div class="flex flex-col space-y-0.5">
                    ${renderFounders(company.founders)}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">${company.founded_year || ''} • ${company.location || ''}</div>
            </td>
            <td class="px-2 py-2">
                <div class="flex flex-wrap gap-0.5">
                    ${renderTags(company.tags, company.id)}
                    <div class="mt-0.5">
                        <form onsubmit="event.preventDefault(); addTag(${company.id}, this.querySelector('input').value); this.querySelector('input').value='';" class="flex items-center">
                            <input type="text" placeholder="Add tag..." class="text-xs w-16 px-1 py-0.5 bg-dark-accent text-gray-200 border border-dark-border rounded-l-md focus:outline-none focus:ring-1 focus:ring-accent-blue">
                            <button type="submit" class="bg-dark-accent border border-dark-border border-l-0 rounded-r-md px-1 py-0.5 text-xs text-gray-400 hover:text-accent-blue">+</button>
                        </form>
                    </div>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Load all companies data from the server for client-side filtering
async function loadAllCompaniesData() {
    try {
        const response = await fetch('/api/companies');
        allCompaniesData = await response.json();
        console.log('Loaded', allCompaniesData.length, 'companies for client-side filtering');
        
        // Update tag filter with all available tags
        const allTags = collectAllTags(allCompaniesData);
        updateTagFilterOptions(allTags);
        
        return allCompaniesData;
    } catch (error) {
        console.error('Error loading companies data:', error);
        return [];
    }
}

// Search and filter companies client-side
function searchAndFilterCompanies(query = '', tags = '', tier = '') {
    console.log('Filtering locally with params:', { query, tags, tier });
    
    if (!allCompaniesData || !allCompaniesData.length) {
        console.error('No company data available for filtering');
        return;
    }
    
    // Convert to lowercase for case-insensitive search
    const searchQuery = query.toLowerCase();
    const tableBody = document.getElementById('companiesTableBody');
    
    // Filter companies based on search query, tag filter, and tier filter
    const filteredCompanies = allCompaniesData.filter(company => {
        // Always check if the company is matching the tier filter
        if (tier && company.tier !== tier) {
            return false;
        }
        
        // Check if the company has the selected tag
        if (tags) {
            if (!company.tags || !company.tags.includes(tags)) {
                return false;
            }
        }
        
        // If we have a search query, check for matches
        if (searchQuery) {
            // Check company name
            if (company.name.toLowerCase().includes(searchQuery)) {
                return true;
            }
            
            // Check company description
            if (company.description && company.description.toLowerCase().includes(searchQuery)) {
                return true;
            }
            
            // Check founders
            if (company.founders && Array.isArray(company.founders)) {
                const foundersMatch = company.founders.some(founder => {
                    if (typeof founder === 'object') {
                        const founderName = founder.name ? founder.name.toLowerCase() : '';
                        return founderName.includes(searchQuery);
                    } else if (typeof founder === 'string') {
                        return founder.toLowerCase().includes(searchQuery);
                    }
                    return false;
                });
                
                if (foundersMatch) {
                    return true;
                }
            }
            
            // No match found
            return false;
        }
        
        // If we don't have a search query, include all companies
        return true;
    });
    
    console.log('Found', filteredCompanies.length, 'companies matching criteria');
    
    // Sort companies by tier first, then by rank
    const sortedCompanies = [...filteredCompanies].sort((a, b) => {
        // First sort by tier - A is better than B is better than C, etc.
        function getTierIndex(tier) {
            switch (tier) {
                case 'A': return 0;
                case 'B': return 1;
                case 'C': return 2;
                case 'D': return 3;
                default: return 4;
            }
        }
        
        const tierDiff = getTierIndex(a.tier) - getTierIndex(b.tier);
        if (tierDiff !== 0) return tierDiff;
        
        // Within same tier, sort by rank (lower is better)
        return a.rank - b.rank;
    });
    
    // Render the filtered and sorted companies
    renderCompanyRows(sortedCompanies, tableBody);
}

// Helper function to render founders list
function renderFounders(founders) {
    if (!founders || !Array.isArray(founders) || founders.length === 0) {
        return '<span class="text-gray-500">No founder info</span>';
    }
    
    // Simply create an unordered list without bullets or periods
    return `<div class="founder-list" style="list-style-type: none; padding-left: 0;">
        ${founders.map(founder => {
            if (typeof founder === 'object' && founder !== null) {
                const founderName = founder.name || 'Unknown';
                const linkedin = founder.linkedin || null;
                
                return `<div class="flex items-center mb-1">
                    <span class="text-sm text-gray-300">${founderName}</span>
                    ${linkedin ? `<a href="${linkedin}" target="_blank" class="ml-2 text-blue-500 hover:text-blue-400 transition-colors duration-200">
                        <i class="fab fa-linkedin text-xs"></i>
                    </a>` : ''}
                </div>`;
            }
            return '';
        }).join('')}
    </div>`;
}

// Helper function to render tags
function renderTags(tags, companyId) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return '';
    }
    
    return tags.map((tag, index) => {
        return `
            <div class="flex items-center bg-dark-accent px-2 py-0.5 rounded-md text-xs">
                <span class="text-gray-300">${tag}</span>
                <button onclick="removeTag(${companyId}, ${index})" class="ml-1 text-gray-500 hover:text-red-400 focus:outline-none">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        `;
    }).join('');
}

// Debounce function to prevent too many API calls
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Fetch and update companies data
async function fetchAndUpdateCompanies() {
    await loadAllCompaniesData();
    
    // Apply current filters
    const searchQuery = document.getElementById('searchInput')?.value || '';
    const tagFilter = document.getElementById('tagFilterSelect')?.value || '';
    const tierFilter = document.getElementById('tierFilterSelect')?.value || '';
    searchAndFilterCompanies(searchQuery, tagFilter, tierFilter);
}

// Load initial data and set up event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Load all companies on initial page load
    await loadAllCompaniesData();
    
    // Initialize the table with all companies
    const tableBody = document.getElementById('companiesTableBody');
    renderCompanyRows(allCompaniesData, tableBody);
    
    // Set up search input with debouncing
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = debounce((event) => {
            const query = event.target.value;
            const tagFilter = document.getElementById('tagFilterSelect')?.value || '';
            const tierFilter = document.getElementById('tierFilterSelect')?.value || '';
            searchAndFilterCompanies(query, tagFilter, tierFilter);
        }, 300);
        
        searchInput.addEventListener('input', debouncedSearch);
    }
    
    // Set up tag filter
    const tagFilterSelect = document.getElementById('tagFilterSelect');
    if (tagFilterSelect) {
        tagFilterSelect.addEventListener('change', (event) => {
            const tagFilter = event.target.value;
            const query = document.getElementById('searchInput')?.value || '';
            const tierFilter = document.getElementById('tierFilterSelect')?.value || '';
            searchAndFilterCompanies(query, tagFilter, tierFilter);
        });
    }
    
    // Set up tier filter
    const tierFilterSelect = document.getElementById('tierFilterSelect');
    if (tierFilterSelect) {
        tierFilterSelect.addEventListener('change', (event) => {
            const tierFilter = event.target.value;
            const query = document.getElementById('searchInput')?.value || '';
            const tagFilter = document.getElementById('tagFilterSelect')?.value || '';
            searchAndFilterCompanies(query, tagFilter, tierFilter);
        });
    }
    
    // Set up clear filters button
    const clearFiltersButton = document.getElementById('clearFilters');
    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', () => {
            // Reset search input
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Reset tag filter
            if (tagFilterSelect) {
                tagFilterSelect.value = '';
            }
            
            // Reset tier filter
            if (tierFilterSelect) {
                tierFilterSelect.value = '';
            }
            
            // Show all companies
            searchAndFilterCompanies('', '', '');
        });
    }
});