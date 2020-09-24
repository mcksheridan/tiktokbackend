window.onload = function tiktok() {
    // Get the thumbnail art for each video
    const videoLinks = document.querySelectorAll('a.tiktok-grid_play')
    const videoImages = document.querySelectorAll('div.tiktok-thumbnail')

    for (let i = 0; i < videoLinks.length; i++) {
        const url = videoLinks[i].getAttribute('id')
        fetch(`https://www.tiktok.com/oembed?url=${url}`)
        .then((response) => response.json())
        .then((data) => {
            if (data.thumbnail_url === undefined) {
                videoImages[i].style.backgroundImage = "url('/../images/videounavailable.jpg')"
            } else {
            videoImages[i].style.backgroundImage = `url(${data.thumbnail_url})` }
        })
    }

    // View add video option
    /*const navigationAddVideo = document.querySelector('.navigation_add-video')
    const addVideo = document.querySelector('#add-video')
    navigationAddVideo.addEventListener('click', () => {
        addVideo.style.display = 'block'
    })*/

    /*function openWindow (click, window, optionalResponse = undefined, ) {
        document.querySelector(click).addEventListener('click', () => {
            if (document.querySelector(window).className === `${window}--hidden`) {
                // Open the menu
                window.className = `${window}--shown`
                click.className = `${click}--expanded`
                optionalResponse.innerText = 'expand_less'
            } else { // close by clicking on the element again
                let bookmarkListShown = document.querySelector('.bookmark-list--shown')
                let navigationLinkListExpanded = document.querySelector('.navigation_link-list--expanded')
                if (bookmarkListShown !== null) { // Avoid the type error
                    bookmarkListShown.className = 'bookmark-list--hidden'
                    navigationLinkListExpanded.className = 'navigation_link-list'
                    materialIconsArrow.innerText = 'expand_more'
            }
        })
    }*/

    // Dropdown menu to change bookmark list
    let navigationLinkList = document.querySelector('.navigation_link-list')
    let bookmarkListHidden = document.querySelector('.bookmark-list--hidden')
    let materialIconsArrow = document.querySelector('.navigation_link-list-button')

    function closeMenu () {
        let bookmarkListShown = document.querySelector('.bookmark-list--shown')
        let navigationLinkListExpanded = document.querySelector('.navigation_link-list--expanded')
        if (bookmarkListShown !== null) { // Avoid the type error
            bookmarkListShown.className = 'bookmark-list--hidden'
            navigationLinkListExpanded.className = 'navigation_link-list'
            materialIconsArrow.innerText = 'expand_more'
        }
    }

    if (navigationLinkList) {
    navigationLinkList.addEventListener('click', () => {
        if (bookmarkListHidden.className === 'bookmark-list--hidden') {
            // Open the menu
            bookmarkListHidden.className = 'bookmark-list--shown'
            navigationLinkList.className = 'navigation_link-list--expanded'
            materialIconsArrow.innerText = 'expand_less'
        } else {
            closeMenu() // Closed the menu by clicking on the menu arrow
        }
    })}

    document.addEventListener('click', (event) => {
        let targetElement = event.target
        if (targetElement.parentNode.className === 'bookmark-list_list') {
            return // Kept the menu open from a menu li option
        } else if (targetElement.className === 'bookmark-list--shown') {
            return // Kept the menu open from the padding on the bookmark menu
        } else if (targetElement.parentNode.className === 'navigation_link-list--expanded') {
            return // Did not automatically close the menu by clicking on the expand menu arrow
        } else
        {
            closeMenu() // Closed the menu by clicking outside of the menu and outside of the menu arrow
        }
    })
           
    // Shorten the names of lengthy bookmark list titles in the navigation menu...
    let navigationLinkListFullTitle = document.querySelector('.navigation_link-list--fulltitle')
    if (navigationLinkListFullTitle) {
        if(navigationLinkListFullTitle.innerText.length > 15) {
        const firstCharacters = navigationLinkListFullTitle.innerText.slice(0, 12)
        navigationLinkListFullTitle.innerText = `${firstCharacters}...`
        //console.log(navigationLinkList.slice(0,7))
    }}
    // ...and in the dropdown menu
    let bookmarkListLink = document.querySelectorAll('a.bookmark-list_link')
    for (let i = 0; i < bookmarkListLink.length; i++) {
        if(bookmarkListLink[i].innerText.length > 20) {
            let firstCharacters = bookmarkListLink[i].innerText.slice(0, 20)
            bookmarkListLink[i].innerText = `${firstCharacters}...`
        }
    }

    // See the author, title, and checkbox for a video when you hover over a TikTok video.

    document.addEventListener('mouseover', function(event) {
        let thumbnail = event.target.parentNode.parentNode.querySelector('.tiktok-thumbnail')
        let tiktokInfo = event.target.parentNode.parentNode.querySelector('.tiktok-grid_info')
        let targetClass = event.target.parentNode.className
        if ((targetClass.startsWith('tiktok-grid')) || (targetClass === 'tiktok-cell') || (targetClass === 'tiktok-container')) {
            if (thumbnail !== null) {
                thumbnail.style.zIndex = '-1'
                tiktokInfo.style.opacity = '1'
        }}
        else {
            if (thumbnail !== null) {
                document.querySelectorAll('.tiktok-thumbnail').forEach(function (thumbnail) {
                    thumbnail.style.zIndex = '0'
                })
                document.querySelectorAll('.tiktok-grid_info').forEach(function (info) {
                    info.style.opacity = '0'
                })
                //document.getElementsByClassName('.tiktok-thumbnail').style.zIndex = '0'
            }
        }
    })

    const popup = document.querySelector('.popup')
    const popupClose = document.querySelector('.popup_close-link')
    const popupMessage = document.querySelector('.popup_message')
    const popupForm = document.querySelector('.popup_form')
    const popupConfirm = document.querySelector('.popup_form-confirm')
    const popupCancel = document.querySelector('.popup_form-cancel')
    const addVideo = document.querySelector('.navigation_add-video')
    const addList = document.querySelector('.navigation_add-list')
    const editList = document.querySelector('.navigation_edit-list')
    const moveDestination = document.querySelector('.form_move-video')
    // const sortVideo = document.querySelector('.navigation_sort-video')
    const formContent = document.querySelector('.form-content')
    const formAddVideo = document.querySelector('.form-add-video')
    const formAddList = document.querySelector('.form-add-list')
    const formEditList = document.querySelector('.form-edit-list')
    // const formSortVideo = document.querySelector('.form-sort-video')

    function openPopup () {
        popup.style.display = 'block'
        popupMessage.style.display = 'none'
        formContent.style.display = 'none'
        formAddVideo.style.display = 'none'
        if (formAddList) {
            formAddList.style.display = 'none'
        }
        if (formEditList) {
            formEditList.style.display = 'none'
        }
        // formSortVideo.style.display = 'none'
        popupForm.style.display = 'none'
        popupClose.addEventListener('click', () => {
            popup.style.display = 'none'
        })
    }

    function closePopup(event) {
        let targetClass = event.target.parentNode.className
        if ((targetClass.startsWith('popup')) ||
        (targetClass.startsWith('navigation')) ||
        (targetClass.startsWith('form')) ||
        (targetClass.startsWith('multiadd'))) { }
        else {
            popup.style.display = 'none'
        }
        return false
    }

    // Open and close TikTok videos in a small div "window"
    const tiktokPopup = document.querySelector('.tiktok-popup')
    const tiktokPopupClose = document.querySelector('.tiktok-popup_close')
    const tiktokPopupVideo = document.querySelector('.tiktok-popup_video')
    const tiktokPopupLink = document.querySelector('.tiktok-popup_link')
    document.addEventListener('click', (event) => {
        const targetClass = event.target.parentNode.className
        if (targetClass.includes('tiktok-grid_play-button')) {
            tiktokPopup.style.display = 'block'
            let targetId = event.target.parentNode.id
            console.log(targetId)
            fetch(`https://www.tiktok.com/oembed?url=${targetId}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.html === undefined) {
                    tiktokPopupVideo.innerHTML = 'Sorry, this video is not available. It may have been deleted.'
                } else {
                    tiktokPopupVideo.innerHTML = data.html
                    tiktokPopupLink.innerHTML = `<a href="${targetId}" target=_blank>Watch this video on TikTok.</a>`
                }})
                tiktokPopupClose.addEventListener('click', () => {
                    tiktokPopup.style.display = 'none'
                })
                document.addEventListener('click', (event) => {
                    const targetClass = event.target.parentNode.className
                    if ((targetClass.includes('tiktok-grid_play-button')) ||
                    (targetClass.startsWith('tiktok-popup')) ||
                    (targetClass.includes('tiktok-embed'))) { }
                    else {
                        tiktokPopup.style.display = 'none'
                    }
                })
            }
        })


    if (addVideo) {
    addVideo.addEventListener('click', () => {
        openPopup()
        formContent.style.display = 'block'
        formAddVideo.style.display = 'block'
        if (formAddList) {
            formAddList.style.display = 'none'
        }
        if (formEditList) {
            formEditList.style.display = 'none'
        }
        // formSortVideo.style.display = 'none'
        const multiaddLink = document.querySelector('.multiadd_help-link')
        const multiaddInfo = document.querySelector('.multiadd_help-info')
        const multiaddInfoClose = document.querySelector('.multiadd_help-info-close')
        multiaddLink.addEventListener('click', () => {
            multiaddInfo.style.display = 'block'
            multiaddInfoClose.addEventListener('click', () => {
                multiaddInfo.style.display = 'none'
            })
        })
        document.addEventListener('click', (event) => {
            closePopup(event)
        })
    })}

    if (addList) {
    addList.addEventListener('click', () => {
        openPopup()
        formContent.style.display = 'block'
        formAddList.style.display = 'block'
        formAddVideo.style.display = 'none'
        if (formEditList) {
            formEditList.style.display = 'none'
        }
        // formSortVideo.style.display = 'none'
        document.addEventListener('click', (event) => {
            closePopup(event)
        })
    })}

    if (editList) {
        editList.addEventListener('click', () => {
            openPopup()
            formContent.style.display = 'block'
            formEditList.style.display = 'block'
            if (formAddList) {
                formAddList.style.display = 'none'
            }
            if (formAddVideo) {
            formAddVideo.style.display = 'none'
            }
            const deleteOption = document.querySelector('.form_delete-option')
            const deleteForm = document.querySelector('.form_delete-form')
            deleteOption.addEventListener('click', () => {
                deleteForm.style.display = 'block'
            })
            document.addEventListener('click', (event) => {
                closePopup(event)
            })
        })
    }

    /*sortVideo.addEventListener('click', () => {
        openPopup()
        formContent.style.dispaly = 'block'
        formSortVideo.style.display = 'block'
        formAddList.style.display = 'none'
        formAddVideo.style.display = 'none'
        document.addEventListener('click', (event) => {
            closePopup(event)
        })
    })*/

    function videoAction(action, inputName, formAction) {
        const checkedVideos = document.querySelectorAll('.tiktok-grid_checkbox input:checked')
        openPopup()
        if (checkedVideos.length === 0) {
            popupMessage.style.display = 'block'
            popupMessage.innerText = `Please select a video to ${action}.`
        } else {
            if (action === 'move') {
                moveDestination.style.display = 'block'
            }
            popupMessage.style.display = 'block'
            popupMessage.innerText = `You have selected ${checkedVideos.length} video(s) to ${action}`
            popupForm.style.display = 'flex'
            popupConfirm.addEventListener('click', () => {
                for (let i = 0; i < checkedVideos.length; i++) {
                    const selectedVideo = document.createElement('input')
                    selectedVideo.type = 'hidden'
                    selectedVideo.name = inputName
                    selectedVideo.value = checkedVideos[i].value
                    popupForm.appendChild(selectedVideo)
                }
                popupForm.method = 'POST'
                popupForm.action = formAction
                popupForm.submit()
            })
            popupCancel.addEventListener('click', () => {
                popup.style.display = 'none'
                return false
            })
        }
        document.addEventListener('click', (event) => {
            closePopup(event)
            return false
        })
    }

    const deleteVideo = document.querySelector('.navigation_delete-video')
    if (deleteVideo) {
    deleteVideo.addEventListener('click', () => {
        videoAction('delete', 'deleted_video', './bookmarks/video/delete')
    })}

    const deleteVideoFromList = document.querySelector('.navigation_delete-video-from-list')
    if (deleteVideoFromList) {
    deleteVideoFromList.addEventListener('click', () => {
        videoAction('delete', 'deleted_video', './delete-video')
    })}
    
    const moveVideo = document.querySelector('.navigation_move-video')
    if (moveVideo) {
    moveVideo.addEventListener('click', () => {
        videoAction('move', 'moved_video', './bookmarks/video/move')
    })}

    const checkAll = document.querySelector('[class*="navigation_link-check"]')
    const checkboxes = document.querySelectorAll('input[name="checkbox"]')
    if (checkAll) {
    checkAll.addEventListener('click', () => {
        if (checkAll.className.includes('navigation_link-check--unchecked')) {
            for (let i = 0; i < checkboxes.length; i++) {
                checkboxes[i].checked = true
            }
            checkAll.innerText = 'check_box_outline_blank'
            checkAll.classList.add('navigation_link-check--checked')
            checkAll.classList.remove('navigation_link-check--unchecked')
        } else {
            for (let i = 0; i < checkboxes.length; i++) {
                checkboxes[i].checked = false
            }
            checkboxes.checked = false
            checkAll.innerText = 'check_box'
            checkAll.classList.add('navigation_link-check--unchecked')
            checkAll.classList.remove('navigation_link-check--checked')
        }
    })}

}
