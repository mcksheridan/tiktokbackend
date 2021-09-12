const hideUserAccountForms = (userAccountForms) => {
  userAccountForms.forEach((form) => {
    // eslint-disable-next-line no-param-reassign
    form.style.display = 'none';
  });
};

export { hideUserAccountForms as default };
