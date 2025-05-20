const TOTAL_POKEMON = 200;
let selectedPairCount = null;
let timer = 0;
let gameOver = false;
let matchesFound = 0;
let totalPairs = 0;
let clickCount = 0;

let timerInterval;
let timeLimit = 60;
let timeLeft = timeLimit;

// Power up variables
let revealUsed = false;
let givePairUsed = false;

// Choose Pokemon that show up
const getRandomUniqueIDs = (count) => {
  const ids = new Set();
  while (ids.size < count) {
    const id = Math.floor(Math.random() * TOTAL_POKEMON) + 1;
    ids.add(id);
  }
  return Array.from(ids);
};

// Get the images of the Pokemon
const fetchPokemonImages = async (count) => {
  const ids = getRandomUniqueIDs(count);
  const promises = ids.map(id =>
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(res => res.json())
  );
  const results = await Promise.all(promises);
  return results.map(p => ({
    name: p.name,
    img: p.sprites.front_default
  }));
};

// Start the timer
function startTimer() {
  timeLeft = timeLimit;
  $("#timeElapsed").text(timeLeft);
  timerInterval = setInterval(() => {
    timeLeft--;
    $("#timeElapsed").text(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endGame(false); // Game over due to timeout
    }
  }, 1000);
}

// End the game when the user finds all pairs
function endGame(won = false) {
  gameOver = true;
  clearInterval(timerInterval);
  $(".card").off("click");
  $(".card").addClass("flip");

  // Time stops and message is displayed
  setTimeout(() => {
    if (won) {
      alert(`You got 'em all! Time left: ${timeLeft} seconds`);
    } else {
      alert("Time's up! Game over");
    }
  }, 200);
}

// Counts amount of pairs found and how many is left
function updatePairsDisplay() {
  $("#pairs_found").text(matchesFound);
  $("#pairs_total").text(totalPairs);
}

// Counts number of total clicks
function updateClickDisplay() {
  $("#clicks").text(clickCount);
}

// Game logic
function setupGameLogic() {
  let firstCard = null;
  let secondCard = null;

  $(".card").on("click", function () {
    if (gameOver || $(this).hasClass("flip") || secondCard) return;

    clickCount++;
    updateClickDisplay();

    $(this).addClass("flip");
    const currentImg = $(this).find(".front_face")[0];

    if (!firstCard) {
      firstCard = currentImg;
    } else {
      secondCard = currentImg;

      if (firstCard.src === secondCard.src) {
        $(firstCard).parent().off("click");
        $(secondCard).parent().off("click");
        $(firstCard).parent().addClass("matched");
        $(secondCard).parent().addClass("matched"); 
        firstCard = null;
        secondCard = null;
        matchesFound++;

        updatePairsDisplay();

        // 🎉 Check for win
        if (matchesFound === totalPairs) {
          endGame(true);
        }

      } else {
        setTimeout(() => {
          if (gameOver) return;
          $(firstCard).parent().removeClass("flip");
          $(secondCard).parent().removeClass("flip");
          firstCard = null;
          secondCard = null;
        }, 1000);
      }
    }
  });
}

// Creating cards
const createCards = (pokemonList) => {
  const cards = [...pokemonList, ...pokemonList]; // make pairs
  const shuffled = cards.sort(() => Math.random() - 0.5);
  $("#gameGrid").empty();
  shuffled.forEach((p, index) => {
    const card = `
      <div class="card" data-name="${p.name}">
        <img class="front_face" id="img${index}" src="${p.img}" />
        <img class="back_face" src="back.webp" />
      </div>
    `;
    $("#gameGrid").append(card);
  });
};

// Run the entire thing
$(document).ready(() => {
  // Difficulty selection: highlight and store choice
  $(".difficulty").on("click", function () {
    $(".difficulty").removeClass("selected");
    $(this).addClass("selected");
    selectedPairCount = parseInt($(this).data("count"));
    $("#startGame").prop("disabled", false);
  });

  // Power ups
  // Power-up: Reveal all button
  $("#revealAll").on("click", function () {
    if (revealUsed || gameOver) return;
    revealUsed = true;
    $("#revealAll").prop("disabled", true);

    $(".card").addClass("flip");
    setTimeout(() => {
      $(".card").not(".matched").removeClass("flip");
    }, 2000);
  });

  // Power-up: Give Pair button
  $("#givePair").on("click", function () {
    if (givePairUsed || gameOver) return;
    givePairUsed = true;
    $("#givePair").prop("disabled", true);

    // Find all unmatched cards
    const unmatched = $(".card").not(".flip, .matched");
    if (unmatched.length < 2) return;

    // Find a pair by data-name
    let found = false;
    unmatched.each(function (i, card1) {
      if (found) return;
      const name1 = $(card1).data("name");
      unmatched.each(function (j, card2) {
        if (i !== j && $(card2).data("name") === name1) {
          // Reveal both cards
          $(card1).addClass("flip matched");
          $(card2).addClass("flip matched");
          // Remove click handler so they stay revealed
          $(card1).off("click");
          $(card2).off("click");
          // Update matchesFound and UI
          matchesFound++;
          updatePairsDisplay();
          // Check for win
          if (matchesFound === totalPairs) {
            endGame(true);
          }
          found = true;
          return false;
        }
      });
    });
  });
  // END Power ups

  // Start button: only starts game after difficulty is chosen
  $("#startGame").on("click", async function () {
    if (!selectedPairCount) return;
    totalPairs = selectedPairCount;
    matchesFound = 0;
    gameOver = false;
    timeLeft = timeLimit;

    // Time limit depending on difficulty chosen
    if (selectedPairCount === 3) {
      timeLimit = 30; // Easy
    } else if (selectedPairCount === 6) {
      timeLimit = 60; // Medium
    } else if (selectedPairCount === 8) {
      timeLimit = 90; // Hard
    }
    timeLeft = timeLimit;

    $("#difficultyScreen").hide();
    $("#gameScreen").show();

    revealUsed = false;
    $("#revealAll").prop("disabled", false);

    givePairUsed = false;
    $("#givePair").prop("disabled", false);

    const difficultyClass = {
      3: 'easy',   // 3 pairs
      6: 'medium', // 6 pairs
      8: 'hard'    // 8 pairs
    }[selectedPairCount];

    const gameGrid = document.getElementById('gameGrid');
    gameGrid.classList.remove('easy', 'medium', 'hard');
    gameGrid.classList.add(difficultyClass);

    const pokemon = await fetchPokemonImages(totalPairs);
    createCards(pokemon);
    setupGameLogic();

    updatePairsDisplay();
    startTimer();

    clickCount = 0;
    updateClickDisplay();
    });

  $("#resetGame").on("click", function () {
    clearInterval(timerInterval);
    $("#gameScreen").hide();
    $("#difficultyScreen").show();
    $("#startGame").prop("disabled", true);
    $(".difficulty").removeClass("selected");
    $("#gameGrid").empty();
    $("#timeElapsed").text("0");
    clearInterval(timerInterval);

    selectedPairCount = null;
    matchesFound = 0;
    totalPairs = 0;
    gameOver = false;
    clickCount = 0;

    timeLeft = timeLimit;
  $("#timeElapsed").text(timeLeft);

    revealUsed = false;
    $("#revealAll").prop("disabled", false);

    givePairUsed = false;
  $("#givePair").prop("disabled", false);

    updateClickDisplay();
  });

  $(".theme").on("click", function () {
    const theme = $(this).data("theme");
    $("body")
      .removeClass("theme-pokeballs theme-pikachu theme-none")
      .addClass(`theme-${theme}`);
  });
});


