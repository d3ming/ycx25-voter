// Function to handle voting through AJAX
async function handleVote(companyId, voteType) {
    try {
        // Get the current vote count element
        const voteDisplayElement = document.getElementById(`voteDisplay${companyId}`);
        
        // Get current vote value
        const currentVotes = parseInt(voteDisplayElement.textContent || '0', 10);
        
        // Update UI immediately for responsive feel (optimistic update)
        const newVotes = voteType === 'up' ? currentVotes + 1 : Math.max(0, currentVotes - 1);
        voteDisplayElement.textContent = newVotes;
        
        // Show feedback animation right away
        voteDisplayElement.classList.add('vote-updated');
        setTimeout(() => {
            voteDisplayElement.classList.remove('vote-updated');
        }, 500);
        
        // Determine the endpoint based on vote type
        const endpoint = voteType === 'up' ? `/upvote/${companyId}` : `/downvote/${companyId}`;
        
        // Make API call in background
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            // Get the actual updated vote count from server
            const data = await response.json();
            
            // Update to server value (only if different from our optimistic update)
            if (data.votes !== newVotes) {
                voteDisplayElement.textContent = data.votes;
            }
        } else {
            // If there was an error, rollback to original value
            console.error('Error updating vote:', response.statusText);
            voteDisplayElement.textContent = currentVotes;
            
            // Show error indicator
            voteDisplayElement.classList.add('vote-error');
            setTimeout(() => {
                voteDisplayElement.classList.remove('vote-error');
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