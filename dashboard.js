// Retrieve games
// Populate dashboard
// Register logout click
// Register open clicks


window.addEventListener('DOMContentLoaded', () => {
    // Apply the respective box-shadow on hover using JavaScript
    document.querySelectorAll('.thumbnail').forEach(thumbnail => {
            thumbnail.addEventListener('mouseover', (event) => {
                console.log("in");
                const shadowColor = event.currentTarget.dataset.shadow;
                console.log(`0px 0px 30px 5px ${shadowColor}`);
                event.currentTarget.style.boxShadow = `0px 0px 30px 5px ${shadowColor}`;
            });

            thumbnail.addEventListener('mouseout', (event) => {
                console.log("out");
                event.currentTarget.style.boxShadow = 'none';
        });
    });
});