// Function to handle ranking through AJAX
async function handleRank(companyId, rankType) {
    try {
        // Get the current rank element
        const rankDisplayElement = document.getElementById(`voteDisplay${companyId}`);
        
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
        // We'll reuse the upvote/downvote endpoints but with inverted logic
        // Since lower rank is better, promote = downvote and demote = upvote
        const endpoint = rankType === 'promote' ? `/downvote/${companyId}` : `/upvote/${companyId}`;
        
        // Make API call in background
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            // Get the actual updated rank from server
            const data = await response.json();
            
            // Update to server value (only if different from our optimistic update)
            if (data.votes !== newRank) {
                rankDisplayElement.textContent = data.votes;
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

// Function to handle manual vote setting
async function submitVote(companyId) {
    try {
        const voteInput = document.getElementById(`voteInput${companyId}`);
        const voteValue = parseInt(voteInput.value, 10);
        const voteDisplay = document.getElementById(`voteDisplay${companyId}`);
        
        // Update display immediately (optimistic update)
        voteDisplay.textContent = voteValue;
        
        // Hide input, show display
        voteDisplay.classList.remove('hidden');
        document.getElementById(`voteForm${companyId}`).classList.add('hidden');
        
        // Flash effect immediately for responsiveness
        voteDisplay.classList.add('vote-updated');
        setTimeout(() => {
            voteDisplay.classList.remove('vote-updated');
        }, 500);
        
        // Make API call in background
        const response = await fetch(`/update_rank/${companyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: `rank=${voteValue}`
        });
        
        if (response.ok) {
            // Get updated data
            const data = await response.json();
            
            // Update display only if different from our optimistic update
            if (data.votes !== voteValue) {
                voteDisplay.textContent = data.votes;
            }
        } else {
            console.error('Error updating vote:', response.statusText);
            // Show error indicator
            voteDisplay.classList.add('vote-error');
            setTimeout(() => {
                voteDisplay.classList.remove('vote-error');
            }, 500);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Show vote input when clicking on vote display
function showVoteInput(companyId) {
    const displayElem = document.getElementById('voteDisplay' + companyId);
    const formElem = document.getElementById('voteForm' + companyId);
    const inputElem = document.getElementById('voteInput' + companyId);
    
    displayElem.classList.add('hidden');
    formElem.classList.remove('hidden');
    inputElem.focus();
    inputElem.select();
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