window.onload = function tiktok() {

    const getVideoThumbnails = function() {
        const videoLinksArray = document.querySelectorAll('a.tiktok-grid_play')
        const videoImagesArray = document.querySelectorAll('div.tiktok-thumbnail')
        for (let i = 0; i < videoLinksArray.length; i++) {
            const videoUrl = videoLinksArray[i].getAttribute('id')
            fetch(`https://www.tiktok.com/oembed?url=${videoUrl}`)
            .then((tiktokResponse) => tiktokResponse.json())
            .then((tiktokData) => {
                if (tiktokData.thumbnail_url === undefined) {
                    videoImagesArray[i].style.backgroundImage = `url('/../images/videounavailable.jpg')`
                } else {
                    videoImagesArray[i].style.backgroundImage = `url(${tiktokData.thumbnail_url})`
                }
            })
        }
    }
    getVideoThumbnails()

    const navigationLinkList = document.querySelector('.navigation_link-list')
    const bookmarkListHidden = document.querySelector('.bookmark-list--hidden')
    const navigationLinkListArrow = document.querySelector('.navigation_link-list-button')

    const closeNavigationLinkList = function () {
        const bookmarkListShown = document.querySelector('.bookmark-list--shown')
        const navigationLinkListExpanded = document.querySelector('.navigation_link-list--expanded')
        if (bookmarkListShown !== null) {
            bookmarkListShown.className = 'bookmark-list--hidden'
            navigationLinkListExpanded.className = 'navigation_link-list'
            navigationLinkListArrow.innerText = 'expand_more'
        }
    }

    const operateNavigationLinkList = function () {
        if (navigationLinkList) {
            navigationLinkList.addEventListener('click', () => {
                if (bookmarkListHidden.className === 'bookmark-list--hidden') {
                    // Open the menu
                    bookmarkListHidden.className = 'bookmark-list--shown'
                    navigationLinkList.className = 'navigation_link-list--expanded'
                    navigationLinkListArrow.innerText = 'expand_less'
                } else {
                    closeNavigationLinkList() // Closed the menu by clicking on the menu arrow
                }
            })
        }
    }
    operateNavigationLinkList()

    const clickOutsideCloseNavigationLinkList = function () {
        document.addEventListener('click', (event) => {
            const targetElement = event.target
            const targetClass = targetElement.className
            const targetParentClass = targetElement.parentNode.className
            if (targetClass === 'bookmark-list--shown' ||
            targetParentClass === 'bookmark-list_list' ||
            targetParentClass === 'navigation_link-list--expanded') {
                return
            }
            closeNavigationLinkList()
        })
    }
    clickOutsideCloseNavigationLinkList()

    const shortenNavigationLinkListName = function () {
        const navigationLinkListFullTitle = document.querySelector('.navigation_link-list--fulltitle')
        if (navigationLinkListFullTitle &&
            navigationLinkListFullTitle.innerText.length > 15) {
                const firstCharacters = navigationLinkListFullTitle.innerText.slice(0, 12)
                navigationLinkListFullTitle.innerText = `${firstCharacters}...`
            }
    }
    shortenNavigationLinkListName()

    const shortenBookmarkListLinkNames = function () {
        const bookmarkListLink = document.querySelectorAll('a.bookmark-list_link')
        for (const listLink of bookmarkListLink) {
            const listLinkLength = listLink.innerText.length
            if (listLinkLength > 20) {
                const firstCharacters = listLink.innerText.slice(0, 20)
                listLink.innerText = `${firstCharacters}...`
            }
        }
    }
    shortenBookmarkListLinkNames()

    const showVideoInformation = function () {
        document.addEventListener('mouseover', function(event) {
            const targetClass = event.target.className
            function changeCellOpacity(thumbnail, info, mouseout) {
                thumbnail.style.zIndex = '-1'
                info.style.opacity = '1'
                if (mouseout === true) {
                    document.addEventListener('mouseout', function(event) {
                        thumbnail.style.zIndex = '0'
                        info.style.opacity = '0'
                    })
                }
            }
            if (targetClass === 'tiktok-cell') {
                changeCellOpacity(event.target.children[0],
                event.target.children[1].children[1],
                true)
            }
            if (targetClass === 'tiktok-thumbnail') {
                changeCellOpacity(event.target,
                    event.target.parentNode.children[1].children[1],
                    true)
            }
            if (targetClass === 'tiktok-grid') {
                changeCellOpacity(event.target.parentNode.children[0],
                    event.target.children[1],
                    true)
            }
            if (targetClass === 'tiktok-grid_checkbox') {
                if (event.target.parentNode.className === 'tiktok-grid') {
                    changeCellOpacity(event.target.parentNode.children[0],
                        event.target.parentNode.children[1],
                        true)
                }
                else {
                    changeCellOpacity(event.target.parentNode.parentNode.parentNode.children[0],
                        event.target.parentNode.parentNode.children[1],
                        true)
                }
            }
            if (targetClass === 'tiktok-grid_info') {
                changeCellOpacity(event.target.parentNode.parentNode.children[0],
                    event.target,
                    true)
            }
            if (targetClass === 'tiktok-grid_author') {
                if (event.target.parentNode.className === 'tiktok-grid_info') {
                    changeCellOpacity(event.target.parentNode.parentNode.parentNode.children[0],
                        event.target.parentNode,
                        true)
                } else {
                    changeCellOpacity(event.target.parentNode.parentNode.parentNode.parentNode.children[0],
                        event.target.parentNode.parentNode,
                        true)
                }
            }
            if (targetClass === 'tiktok-grid_title') {
                changeCellOpacity(event.target.parentNode.parentNode.parentNode.children[0],
                    event.target.parentNode,
                    true)
            }
            if (targetClass === 'tiktok-grid_play-button') {
                changeCellOpacity(event.target.parentNode.parentNode.parentNode.children[0],
                    event.target.parentNode.parentNode.children[1],
                    true)
            }
            if (targetClass === 'tiktok-grid_play') {
                if (event.target.parentNode.parentNode.className === 'tiktok-cell') {
                    changeCellOpacity(event.target.parentNode.parentNode.children[0],
                        event.target.parentNode.children[1],
                        true)
                } else if (event.target.parentNode.parentNode.className === 'tiktok-grid') {
                    changeCellOpacity(event.target.parentNode.parentNode.parentNode.children[0],
                        event.target.parentNode.parentNode.children[1],
                        true)
                } else {
                    changeCellOpacity(event.target.parentNode.parentNode.parentNode.parentNode.children[0],
                        event.target.parentNode.parentNode.parentNode.children[1],
                        true)
                }
            }
        })
    }
    showVideoInformation()

    const popup = document.querySelector('.popup')
    const popupClose = document.querySelector('.popup_close-link')
    const popupMessage = document.querySelector('.popup_message')
    const popupForm = document.querySelector('.popup_form')
    const popupConfirm = document.querySelector('.popup_form-confirm')
    const popupCancel = document.querySelector('.popup_form-cancel')
    const addVideo = document.querySelector('.navigation_add-video')
    const addList = document.querySelector('.navigation_add-list')
    const editList = document.querySelector('.navigation_edit-list')
    const sortList = document.querySelector('.navigation_sort-list')
    const moveDestination = document.querySelector('.form_move-video')
    const sortVideo = document.querySelector('.navigation_sort-video')
    const formContent = document.querySelector('.form-content')
    const formAddVideo = document.querySelector('.form-add-video')
    const formAddList = document.querySelector('.form-add-list')
    const formEditList = document.querySelector('.form-edit-list')
    const formSortList = document.querySelector('.form-sort-list')
    const formSortVideo = document.querySelector('.form-sort-video')

    function hideForms () {
        popupMessage.style.display = 'none'
        formContent.style.display = 'none'
        if (formAddVideo) {
            formAddVideo.setAttribute('display','none')
        }
        if (formAddList) {
            formAddList.style.display = 'none'
        }
        if (formEditList) {
            formEditList.style.display = 'none'
        }
        if (formSortList) {
            formSortList.style.display = 'none'
        }
        if (formSortVideo) {
            formSortVideo.style.display = 'none'
        }
        popupForm.style.display = 'none'
    }

    function openPopup () {
        popup.style.display = 'block'
        hideForms()
        popupClose.addEventListener('click', () => {
            popup.style.display = 'none'
        })
    }

    function closePopup(event) {
        let targetClass = event.target.parentNode.className
        if ((targetClass.startsWith('popup')) ||
        (targetClass.startsWith('navigation')) ||
        (targetClass.startsWith('form')) ||
        (targetClass.startsWith('multiadd')) ||
        (targetClass.startswith('video-sort_dropdown'))) { }
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
            fetch(`https://www.tiktok.com/oembed?url=${targetId}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.html === undefined) {
                    tiktokPopupVideo.innerHTML = 'Sorry, this video is not available. It may have been deleted.'
                } else {
                    const videoRegex = new RegExp(/\d{1,}/)
                    const videoId = targetId.match(videoRegex).toString()
                    tiktokPopupVideo.innerHTML = `<iframe src="https://www.tiktok.com/embed/${videoId}" class="tiktok-popup_iframe"></iframe>`
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
        document.addEventListener('click', (event) => {
            closePopup(event)
        })
    })}

    if (editList) {
        editList.addEventListener('click', () => {
            openPopup()
            formContent.style.display = 'block'
            formEditList.style.display = 'block'
            formAddVideo.style.display = 'none'
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

    if (sortList) {
        sortList.addEventListener('click', () => {
            openPopup()
            formContent.style.display = 'block'
            formSortList.style.display = 'block'
            formAddVideo.style.display = 'none'
            document.addEventListener('click', (event) => {
                closePopup(event)
            })
        })
    }

    if (sortVideo) {
    sortVideo.addEventListener('click', () => {
        openPopup()
        formContent.style.dispaly = 'block'
        formSortVideo.style.display = 'block'
        document.addEventListener('click', (event) => {
            closePopup(event)
        })
    })}

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
        videoAction('delete', 'deleted_video', '/../bookmarks/video/delete')
    })}

    const deleteVideoFromList = document.querySelector('.navigation_delete-video-from-list')
    if (deleteVideoFromList) {
    deleteVideoFromList.addEventListener('click', () => {
        videoAction('delete', 'deleted_video', '../delete-video')
    })}
    
    const moveVideo = document.querySelector('.navigation_move-video')
    if (moveVideo) {
    moveVideo.addEventListener('click', () => {
        videoAction('move', 'moved_video', './video/move')
    })}

    const checkAll = document.querySelector('[class*="navigation_link-check"]')
    const checkboxes = document.querySelectorAll('input[name="checkbox"]')
    if (checkAll) {
    checkAll.addEventListener('click', () => {
        if (checkAll.className.includes('navigation_link-check--unchecked')) {
            for (const checkbox of checkboxes) {
                checkbox.checked = true
            }
            checkAll.innerText = 'check_box_outline_blank'
            checkAll.classList.add('navigation_link-check--checked')
            checkAll.classList.remove('navigation_link-check--unchecked')
        } else {
            for (const checkbox of checkboxes) {
                checkbox.checked = false
            }
            checkboxes.checked = false
            checkAll.innerText = 'check_box'
            checkAll.classList.add('navigation_link-check--unchecked')
            checkAll.classList.remove('navigation_link-check--checked')
        }
    })}

    const userAccount = document.querySelector('.user-account')
    const tiktokContainer = document.querySelector('.tiktok-container')
    const userAccountLink = document.querySelector('.content_info-user-account-link')
    const videoReturnLink = document.querySelector('.user-account__return-button')

    const showUserAccount = () => {
        userAccountLink.addEventListener('click', () => {
            tiktokContainer.style.display = 'none'
            userAccount.style.display = 'block'
        })
    }
    showUserAccount()

    const hideUserAccount = () => {
        videoReturnLink.addEventListener('click', () => {
            userAccount.style.display = 'none'
            tiktokContainer.style.display = 'grid'
        })
    }
    hideUserAccount()

    const showUserAccountForm = (action) => {
        const arrowDirection = document.querySelector(`.user-account_${action}-arrow`)
        if (arrowDirection.innerText === 'expand_more') {
            document.querySelector(`.user-account_${action}`).addEventListener('click', () => {
                document.querySelector(`.form-${action}`).style.display = 'block'
                document.querySelector(`.user-account_${action}-arrow`).innerText = 'expand_less'
            })
        }
    }

    showUserAccountForm('change-username')
    showUserAccountForm('change-password')
    showUserAccountForm('delete-account')

    const hideUserAccountForm = (action) => {
        const arrowDirection = document.querySelector(`.user-account_${action}-arrow`)
        if (arrowDirection.innerText === 'expand_less') {
            document.querySelector(`.user-account_${action}`).addEventListener('click', () => {
                console.log('something')
                document.querySelector(`.form-${action}`).style.display = 'none'
                document.querySelector(`.user-account_${action}-arrow`).innerText = 'expand_more'
            })
        }
    }

    hideUserAccountForm('change-username')
    hideUserAccountForm('change-password')
    hideUserAccountForm('delete-account')

}
