import streamlit as st
import pandas as pd
import os
from data_processor import load_and_process_data, initialize_session_data
from utils import upvote_company, toggle_favorite, update_note, get_sorted_companies, generate_mail_link, get_company_stats

# Page configuration
st.set_page_config(
    page_title="YC X25 Batch Explorer for Angel Investors",
    page_icon="💸",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Load and initialize data
@st.cache_data
def load_data():
    return load_and_process_data("attached_assets/yc_companies_S25.csv")

# Main application
def main():
    companies_list = load_data()
    initialize_session_data(companies_list)
    
    # Header section
    col1, col2 = st.columns([4, 1])
    with col1:
        st.title("YC X25 Batch Explorer")
        st.subheader("Discover and track promising startups for angel investment")
    
    # Dashboard statistics in sidebar
    st.sidebar.title("Angel Investor Dashboard")
    
    # Stock image for investor
    st.sidebar.image("https://pixabay.com/get/g67f78b776d5c6e42a9eabd67661ca5984755721a629d470cd73d8ab93a4de4ed8044fccb5c901bf5aa33dee02a612bd20c4af5a0cb35cfd67db5b62c09ded559_1280.jpg", 
                     caption="Angel Investment Portfolio", use_container_width=True)
    
    # Statistics
    stats = get_company_stats()
    st.sidebar.subheader("Your Portfolio")
    st.sidebar.metric("Total Companies", stats['total'])
    st.sidebar.metric("Favorited Companies", stats['favorited'])
    st.sidebar.metric("Companies with Notes", stats['with_notes'])
    st.sidebar.metric("Most Upvoted Company", f"{stats['most_upvoted'][0]} ({stats['most_upvoted'][1]} votes)")
    
    # Filters
    st.sidebar.subheader("Filters")
    
    # Search box
    search_term = st.sidebar.text_input(
        "Search companies or founders",
        value=st.session_state.filters['search']
    )
    st.session_state.filters['search'] = search_term
    
    # Sort options
    sort_options = [
        "Company Name", 
        "Upvotes (High to Low)", 
        "Upvotes (Low to High)",
        "Founded Year (Newest First)",
        "Founded Year (Oldest First)"
    ]
    sort_by = st.sidebar.selectbox(
        "Sort by",
        options=sort_options,
        index=sort_options.index(st.session_state.filters['sort_by'])
    )
    st.session_state.filters['sort_by'] = sort_by
    
    # Filter checkboxes
    show_favorites = st.sidebar.checkbox(
        "Show favorites only", 
        value=st.session_state.filters['show_favorites_only']
    )
    st.session_state.filters['show_favorites_only'] = show_favorites
    
    has_notes = st.sidebar.checkbox(
        "Show companies with notes only", 
        value=st.session_state.filters['has_notes_only']
    )
    st.session_state.filters['has_notes_only'] = has_notes
    
    st.sidebar.caption("Data source: Y Combinator S25 Batch")
    
    # Founder showcase area
    st.subheader("Featured Founders")
    founder_cols = st.columns(4)
    
    founder_images = [
        "https://pixabay.com/get/g2b265a863cb49884ebfb747dbbff5e577ebdf7b3517c02511837ffd89d0da56c22fe5ed4bca6a4d10d4fcf18c4101613b5451a7d1f9a8c756e7bcb5e24eb549c_1280.jpg",
        "https://pixabay.com/get/ged9746bd417a401ee702f294ba683c7291e2c25a78da73659edab026b9b51abda9ef48f1030faf7c1d1f04851527b63cebf563735377c09dd350025deaa40fe9_1280.jpg",
        "https://pixabay.com/get/g32bff17417929efdb74b6f3edede57de723437937ae869c448a90624f711c7250559ed970b275ace07182021ad97e65fb73ce4484f8b56ce0c91fd909f06b7cf_1280.jpg",
        "https://pixabay.com/get/g91ff954d3a237a120ddcda5f2166cf11579e59558acb3e485ee0f93a5267fdfb2b11d0b932f717d66ea7985d67096149c00d74f4fee706957c3aacf185624cbf_1280.jpg"
    ]
    
    for i, col in enumerate(founder_cols):
        with col:
            st.image(founder_images[i], width=150, use_container_width=False)
            if i == 0:
                st.caption("Serial Entrepreneurs Building Next-Gen Tech")
            elif i == 1:
                st.caption("Innovative Thinkers Reshaping Industries")
            elif i == 2:
                st.caption("Technical Founders with Deep Domain Expertise")
            else:
                st.caption("Visionaries Creating Tomorrow's Solutions")
    
    # Main content - Company listings
    st.header("Companies")
    
    filtered_companies = get_sorted_companies()
    
    if not filtered_companies:
        st.info("No companies match your current filters. Please adjust your search criteria.")
    else:
        st.success(f"Showing {len(filtered_companies)} companies")
        
        # Company office image
        col1, col2 = st.columns([1, 1])
        with col1:
            st.image("https://pixabay.com/get/g588f01a7a1bf02403bd308c8eb757cc4b429871dd1eea916441be238cff44adf967dcbaddbd83c4ec84247055482608e4219b7f59977c114fc8b53b78e5941d0_1280.jpg", 
                     caption="Startup Office Environment", use_container_width=True)
        with col2:
            st.image("https://pixabay.com/get/gfd075e42e83d8f72a701927f52213a2278e3263bd64c3402bc7c51744b88b43be7359a8615abe0f2b2508a55efea251dcdea17982c046480cc8ba4decfcd5972_1280.jpg", 
                     caption="Innovation Workspace", use_container_width=True)
        
        # Display each company as a card
        for company in filtered_companies:
            company_name = company['name']
            has_notes = bool(st.session_state.notes[company_name])
            is_favorite = st.session_state.favorites[company_name]
            
            # Create a card-like container for each company
            with st.container():
                st.divider()
                
                # Company header with name and favorite indicator
                col1, col2, col3 = st.columns([3, 1, 1])
                with col1:
                    # Display star if favorited
                    title_prefix = "⭐ " if is_favorite else ""
                    # Display note indicator
                    title_suffix = " 📝" if has_notes else ""
                    st.subheader(f"{title_prefix}{company_name}{title_suffix}")
                
                with col2:
                    # Upvote button and counter
                    upvote_col, count_col = st.columns([1, 1])
                    with upvote_col:
                        if st.button("👍", key=f"upvote_{company_name}"):
                            upvote_company(company_name)
                            st.rerun()
                    with count_col:
                        st.write(f"{st.session_state.upvotes[company_name]} votes")
                
                with col3:
                    # Favorite toggle
                    favorite_text = "★ Unfavorite" if is_favorite else "☆ Favorite"
                    if st.button(favorite_text, key=f"fav_{company_name}"):
                        toggle_favorite(company_name)
                        st.rerun()
                
                # Company info
                col1, col2 = st.columns([3, 2])
                
                with col1:
                    st.markdown(f"**Description:** {company['short_description']}")
                    st.markdown(f"**Founded:** {company['founded_year']} | **Location:** {company['location']}")
                    
                    # Website and LinkedIn links
                    links_col1, links_col2, links_col3 = st.columns([1, 1, 2])
                    with links_col1:
                        st.markdown(f"[🌐 Website]({company['website']})")
                    with links_col2:
                        if company['company_linkedin']:
                            st.markdown(f"[LinkedIn]({company['company_linkedin']})")
                    with links_col3:
                        st.markdown(f"[✉️ Contact]({generate_mail_link(company)})")
                
                with col2:
                    # Founders
                    st.markdown("**Founders:**")
                    for founder in company['founders']:
                        if founder['linkedin']:
                            st.markdown(f"• [{founder['name']}]({founder['linkedin']})")
                        else:
                            st.markdown(f"• {founder['name']}")
                
                # Notes section
                with st.expander("Notes", expanded=has_notes):
                    note = st.text_area(
                        "Your investment notes",
                        value=st.session_state.notes[company_name],
                        key=f"note_{company_name}",
                        height=100
                    )
                    
                    if st.button("Save Note", key=f"save_note_{company_name}"):
                        update_note(company_name, note)
                        st.success("Note saved!")

if __name__ == "__main__":
    main()
