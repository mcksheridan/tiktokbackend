const toggleUserAccountOptions = (userAccountButton) => {
  if (userAccountButton) {
    userAccountButton.forEach((button) => {
      button.addEventListener('click', () => {
        const buttonArrow = button.querySelector('.material-icons');
        const userAccountForm = button.nextSibling;
        if (button.getAttribute('aria-expanded') === 'true') {
          button.setAttribute('aria-expanded', 'false');
          buttonArrow.classList.add('material-icons--closed');
          buttonArrow.classList.remove('material-icons--open');
          buttonArrow.innerText = 'expand_more';
          userAccountForm.style.display = 'none';
          return;
        }
        button.setAttribute('aria-expanded', 'true');
        buttonArrow.classList.add('material-icons--open');
        buttonArrow.classList.remove('material-icons--closed');
        buttonArrow.innerText = 'expand_less';
        userAccountForm.style.display = 'flex';
      });
    });
  }
};

export { toggleUserAccountOptions as default };
