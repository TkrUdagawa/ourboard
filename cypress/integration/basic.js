import _ from "lodash"

// Cypress doesn't use a DragEvent but just an Event, so it doesn't have dataTransfer property...
// https://github.com/cypress-io/cypress/issues/649
const mockDataTransfer = {
    setDragImage: () => null,
}

const BACKSPACE = 8
const DELETE = 46

const NotesWithText = (text) => cy.get(`[data-test^="note"][data-test*="${text}"]`)
const SelectedNotes = () => cy.get(`[data-test^="note-selected"]`)
const SelectedNoteTexts = () => cy.get(`[data-test^="note-selected"] .text`)

const Containers = () => cy.get(`[data-test^="container"]`)
const TextItemsWithText = (text) => cy.get(`[data-test^="text"][data-test*="${text}"]`)

const PaletteNote = (color) => cy.get(`[data-test^="palette-new-note"]`)
const PaletteContainer = () => cy.get(`[data-test="palette-new-container"]`)
const PaletteText = () => cy.get(`[data-test="palette-new-text"]`)

describe("Initial screen", () => {
    it("Opens correctly", () => {
        cy.visit("http://localhost:1337")
        cy.get('[data-test="app-title"').contains("R-Board").should("be.visible")
    })

    it("Navigating to example board works via link", () => {
        cy.visit("http://localhost:1337")
        cy.get("a").contains("Example Board").click()

        cy.url().should("eq", "http://localhost:1337/b/default")

        cy.get('[data-test="board-name"]').contains("Test Board").should("be.visible")
    })

    it("Creating new board works", () => {
        cy.visit("http://localhost:1337")
        cy.get('input[placeholder="Enter board name"').type("ReaktorIsTheBest")
        cy.get('[data-test="create-board-submit"]').click()

        cy.url().should("contain", "http://localhost:1337/b/")
        cy.get('[data-test="board-name"]').contains("ReaktorIsTheBest").should("be.visible")
    })
})

describe("Example board", () => {
    it("Opens correctly from direct link", () => {
        cy.visit("http://localhost:1337/b/default")
        cy.get('[data-test="board-name"]').contains("Test Board").should("be.visible")
    })
})

function createNote(text, relX, relY, color = "yellow") {
    PaletteNote().then((elements) => {
        const { x, y } = elements[0].getBoundingClientRect()
        PaletteNote().trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
        cy.get(".board").trigger("dragover", { force: true, pageX: x + relX, pageY: y + relY })
        // Dragging from palette is not shown in realtime, so the event is different here.
        PaletteNote().trigger("dragend", { force: true })

        NotesWithText("HELLO").should("exist")

        cy.get(".text").contains("HELLO").type(text)

        NotesWithText(text).should("exist")

        clickBoard()
    })
}

function clickBoard() {
    cy.get(".board").click({ force: true })
}

function createTextItem(text, relX, relY) {
    PaletteText().then((elements) => {
        const { x, y } = elements[0].getBoundingClientRect()
        PaletteText().trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
        cy.get(".board").trigger("dragover", { force: true, pageX: x + relX, pageY: y + relY })
        PaletteText().trigger("dragend", { force: true })

        TextItemsWithText("HELLO").should("exist")

        TextItemsWithText("HELLO").get(".text").contains("HELLO").type(text)

        TextItemsWithText(text).should("exist")

        clickBoard()
    })
}

function createContainer(relX, relY) {
    PaletteContainer().then((elements) => {
        const { x, y } = elements[0].getBoundingClientRect()

        PaletteContainer().trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
        cy.get(".board").trigger("dragover", { force: true, pageX: x + relX, pageY: y + relY })
        PaletteContainer().trigger("dragend", { force: true })

        Containers().should("exist")

        clickBoard()
    })
}

describe("Board functionality", () => {
    beforeEach(() => {
        cy.viewport("macbook-15")
        cy.visit("http://localhost:1337")
        cy.get('input[placeholder="Enter board name"').type("ReaktorIsTheBest")
        cy.get('[data-test="create-board-submit"]').click()

        cy.url().should("contain", "http://localhost:1337/b/")

        cy.get('[data-test="board-name"]').contains("ReaktorIsTheBest").should("be.visible")
    })

    it("Can select note by dragging on board with ALT pressed", () => {
        createNote("HELLO", 120, 120)

        cy.get(".board").then((board) => {
            const { x, y } = board[0].getBoundingClientRect()
            cy.get(".board").trigger("dragstart", {
                altKey: true,
                force: true,
                dataTransfer: mockDataTransfer,
                pageX: x + 10,
                pageY: y + 10,
            })
            cy.get(".board").trigger("dragover", { force: true, pageX: x + 600, pageY: y + 300 })
            cy.get(".board").trigger("drag", { force: true, pageX: x + 600, pageY: y + 300 })

            SelectedNoteTexts().then((els) => {
                expect(els.length, "One note should be selected").to.equal(1)
                expect(els[0].innerText, "Note 'HELLO' should be selected").to.equal("HELLO")
            })
        })
    })

    it("Can select multiple notes by clicking with SHIFT key", () => {
        createNote("Item 1", 120, 120)
        createNote("Item 2", 150, 150)
        NotesWithText("Item 1").click({ force: true })
        NotesWithText("Item 2").click({ force: true, shiftKey: true })

        SelectedNotes().then((els) => {
            expect(els.length, "Both notes should be selected when using shift-click").to.equal(2)
        })
    })

    it("Can create note by dragging from palette", () => {
        createNote("HELLO", 350, 200)
    })

    it("Can create text item by dragging from palette", () => {
        createTextItem("TextTest", 350, 200)
    })

    it("Can create container by dragging from palette", () => {
        createContainer(350, 200)
    })

    it("Can edit note text", () => {
        createNote("Hello", 350, 200)
        cy.get(".text").contains("Hello").type("Monoids")
        cy.get(".board .note").contains("Monoids").should("be.visible")
        cy.get(".board .note").contains("Hello").should("not.be.visible")
    })

    it("Persists changes", () => {
        createNote("Hello", 350, 200)
        cy.get(".text").contains("Hello").type("Monoids")
        cy.reload()
        cy.get(".board .note").contains("Monoids").should("be.visible")
        cy.get(".board .note").contains("Hello").should("not.be.visible")
    })

    it("Can drag note", () => {
        createNote("Monoids", 350, 200)

        let originalX, originalY
        NotesWithText("Monoids").then((elements) => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX = x
            originalY = y

            // Since our app logic calculates the new position for a note based on dragstart position and current client mouse position,
            // This test requires the following: 1. dragstart on source element 2. dragover on board to trigger clientCoordinates change 3. drag on source element
            NotesWithText("Monoids")
                .click({ force: true })
                .trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })

            cy.get(".board").trigger("dragover", { force: true, pageX: x + 100, pageY: y - 100 })
            NotesWithText("Monoids").trigger("drag", { force: true })
        })

        NotesWithText("Monoids").then((elements) => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Note 'Monoids' should have moved to the right").to.be.greaterThan(originalX)
            expect(y, "Note 'Monoids' should have moved upward").to.be.lessThan(originalY)
        })
    })

    it("Can drag multiple notes", () => {
        createNote("World", 200, 200)
        createNote("Monoids", 250, 200)
        let originalX, originalY, originalX2, originalY2
        NotesWithText("World").then((elements) => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX2 = x
            originalY2 = y
        })
        NotesWithText("Monoids").then((elements) => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            originalX = x
            originalY = y

            NotesWithText("Monoids").click({ force: true, shiftKey: true })
            NotesWithText("World").click({ force: true, shiftKey: true })

            SelectedNoteTexts().then((els) => {
                expect(els.length, "Both notes should be selected when using shift-click").to.equal(2)
            })

            NotesWithText("Monoids").trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })

            cy.get(".board").trigger("dragover", { force: true, pageX: x - 100, pageY: y + 100 })
            NotesWithText("Monoids").trigger("drag", { force: true })
        })

        NotesWithText("Monoids").then((elements) => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Note 'Monoids' should have moved to the left").to.be.lessThan(originalX)
            expect(y, "Note 'Monoids' should have moved downward").to.be.greaterThan(originalY)
        })

        NotesWithText("World").then((elements) => {
            const source = elements[0]
            const { x, y } = source.getBoundingClientRect()
            expect(x, "Note 'World' should have moved to the left").to.be.lessThan(originalX2)
            expect(y, "Note 'World' should have moved downward").to.be.greaterThan(originalY2)
        })
    })

    it("Can drag-to-resize note", () => {
        createNote("Monoids", 250, 200)

        let originalWidth, originalHeight
        NotesWithText("Monoids").then((elements) => {
            const source = elements[0]
            const { x, y, width, height } = source.getBoundingClientRect()
            originalWidth = width
            originalHeight = height
            NotesWithText("Monoids").click({ force: true })
            NotesWithText("Monoids")
                .get(".corner-resize-drag.bottom.right")
                .trigger("dragstart", { force: true, dataTransfer: mockDataTransfer })
            cy.get(".board").trigger("dragover", { force: true, pageX: x + 200, pageY: y + 200 })
            NotesWithText("Monoids").get(".corner-resize-drag.bottom.right").trigger("drag", { force: true })
        })

        NotesWithText("Monoids").then((elements) => {
            const source = elements[0]
            const { width, height } = source.getBoundingClientRect()
            expect(width, "Note 'Monoids' width should have increased").to.be.greaterThan(originalWidth)
            expect(height, "Note 'Monoids' height should have increased").to.be.greaterThan(originalHeight)
        })
    })

    it("Can change color of existing note from context menu", () => {
        createNote("HELLO", 250, 200)
        let originalColor
        NotesWithText("HELLO").then((els) => {
            originalColor = els[0].style.background
            expect(originalColor).not.to.equal(undefined)
        })

        NotesWithText("HELLO").click({ force: true })
        cy.get(".text").contains("HELLO").type("Monoids")
        cy.get(".context-menu").scrollIntoView().should("be.visible")
        cy.get(".colors")
            .find(".color")
            .then((elements) => {
                const templateWithNewColor = [...elements].find(
                    (el) => el.style.background && el.style.background !== originalColor,
                )
                const newColor = templateWithNewColor.style.background

                templateWithNewColor.click()
                NotesWithText("Monoids").then((els) => {
                    expect(els[0].style.background, `Note 'HELLO' should have turned ${newColor}`).to.equal(newColor)
                })
            })
    })

    it.skip("Can cut, copy and paste note -- figure out how to work around native clipboard stuff not working with cypress", () => {
        createNote("HELLO", 250, 200)
        NotesWithText("HELLO").click({ force: true }).trigger("cut", { force: true })

        cy.contains("HELLO").should("not.exist")

        cy.get(".board").trigger("paste", { force: true })

        NotesWithText("HELLO").then((els) => {
            expect(els.length, "One note with text 'HELLO' should exist").to.equal(1)
        })

        SelectedNoteTexts().then((els) => {
            expect(els.length, "One note should be selected after cut").to.equal(1)
            expect(els[0].innerText, "Note 'HELLO' should be selected after cut").to.equal("HELLO")
        })

        NotesWithText("HELLO").click({ force: true }).trigger("copy", { force: true }).trigger("paste", { force: true })

        NotesWithText("HELLO").then((els) => {
            expect(els.length, "Two notes with text 'HELLO' should exist").to.equal(2)
        })

        SelectedNoteTexts().then((els) => {
            expect(els.length, "One note should be selected after copy").to.equal(1)
            expect(els[0].innerText, "Note 'HELLO' should be selected after copy").to.equal("HELLO")
        })
    })

    it("Can delete notes with backspace key", () => {
        createNote("Monoids", 250, 200)
        createNote("World", 150, 200)
        NotesWithText("Monoids").click({ force: true, shiftKey: true })
        NotesWithText("World").click({ force: true, shiftKey: true })
        NotesWithText("World").trigger("keyup", { keyCode: BACKSPACE, which: BACKSPACE, force: true })

        NotesWithText("Monoids").should("not.exist")
        NotesWithText("World").should("not.exist")
    })

    it("Can delete notes with delete key", () => {
        createNote("Monoids", 250, 200)
        createNote("World", 150, 200)
        NotesWithText("Monoids").click({ force: true, shiftKey: true })
        NotesWithText("World").click({ force: true, shiftKey: true })
        NotesWithText("World").trigger("keyup", { keyCode: DELETE, which: DELETE, force: true })

        NotesWithText("Monoids").should("not.exist")
        NotesWithText("World").should("not.exist")
    })

    function createNotesAndAlign(iconSelector) {
        createNote("ALIGN", 250, 120)
        createNote("ALL", 300, 100)
        createNote("THESE", 320, 190)
        createNote("BUT NOT THIS", 300, 250)

        NotesWithText("ALIGN").click({ force: true })
        NotesWithText("ALL").click({ force: true, shiftKey: true })
        NotesWithText("THESE").click({ force: true, shiftKey: true })
        cy.get(".context-menu").scrollIntoView().should("be.visible")

        const originalX = []
        const originalY = []
        SelectedNotes().then((els) => {
            expect(els.length, "Three notes should be selected").to.equal(3)
            ;[...els].forEach((source) => {
                const rect = source.getBoundingClientRect()
                const parentRect = source.parentNode.getBoundingClientRect()
                originalX.push(rect.x - parentRect.x)
                originalY.push(rect.y - parentRect.y)
            })
        })

        cy.get(iconSelector).click()

        return { originalX, originalY }
    }

    const getCoordinate = (source, axis) => {
        return source.getBoundingClientRect()[axis] - source.parentNode.getBoundingClientRect()[axis]
    }
    const getX = (source) => getCoordinate(source, "x")
    const getY = (source) => getCoordinate(source, "y")

    it("Can align notes to horizontal left from context menu", () => {
        const { originalX, originalY } = createNotesAndAlign(".align_horizontal_left")

        SelectedNotes().then((els) => {
            ;[...els].forEach((source) => {
                expect(getX(source), "Selected notes should have smallest of x coordinates").to.equal(_.min(originalX))
            })
            expect([...els].map(getY), "Selected notes should have original y coordinates").to.deep.equal(originalY)
        })
    })

    it("Can align notes to horizontal center from context menu", () => {
        const { originalX, originalY } = createNotesAndAlign(".align_horizontal_center")

        SelectedNotes().then((els) => {
            ;[...els].forEach((source) => {
                expect(
                    getX(source),
                    "Selected notes should have average of smallest and largest of x coordinates",
                ).to.equal((_.min(originalX) + _.max(originalX)) / 2)
            })
            expect([...els].map(getY), "Selected notes should have original y coordinates").to.deep.equal(originalY)
        })
    })

    it("Can align notes to horizontal right from context menu", () => {
        const { originalX, originalY } = createNotesAndAlign(".align_horizontal_right")

        SelectedNotes().then((els) => {
            ;[...els].forEach((source) => {
                expect(getX(source), "Selected notes should have largest of x coordinates").to.equal(_.max(originalX))
            })
            expect([...els].map(getY), "Selected notes should have original y coordinates").to.deep.equal(originalY)
        })
    })

    it("Can align notes to vertical top from context menu", () => {
        const { originalX, originalY } = createNotesAndAlign(".align_vertical_top")

        SelectedNotes().then((els) => {
            ;[...els].forEach((source) => {
                expect(getY(source), "Selected notes should have smallest of y coordinates").to.equal(_.min(originalY))
            })
            expect([...els].map(getX), "Selected notes should have original x coordinates").to.deep.equal(originalX)
        })
    })

    it("Can align notes to vertical center from context menu", () => {
        const { originalX, originalY } = createNotesAndAlign(".align_vertical_center")

        SelectedNotes().then((els) => {
            ;[...els].forEach((source) => {
                expect(
                    getY(source),
                    "Selected notes should have average of smallest and largest of y coordinates",
                ).to.equal((_.min(originalY) + _.max(originalY)) / 2)
            })
            expect([...els].map(getX), "Selected notes should have original x coordinates").to.deep.equal(originalX)
        })
    })

    it("Can align notes to vertical bottom from context menu", () => {
        const { originalX, originalY } = createNotesAndAlign(".align_vertical_bottom")
        SelectedNotes().then((els) => {
            ;[...els].forEach((source) => {
                expect(getY(source), "Selected notes should have largest of y coordinates").to.equal(_.max(originalY))
            })
            expect([...els].map(getX), "Selected notes should have original x coordinates").to.deep.equal(originalX)
        })
    })

    it("Can distribute notes horizontally from context menu", () => {
        const { originalY } = createNotesAndAlign(".horizontal_distribute")

        SelectedNotes().then((els) => {
            const newEls = [...els]
            const distances = newEls.map((source, index) =>
                index > 0 ? getX(source) - getX(newEls[index - 1]) : undefined,
            )
            expect(
                _.uniq(_.compact(distances)).length,
                "Selected notes should have x coordinates equally spaced",
            ).to.equal(1)
            expect([...els].map(getY), "Selected notes should have original y coordinates").to.deep.equal(originalY)
        })
    })

    it("Can distribute notes vertically from context menu", () => {
        const { originalX } = createNotesAndAlign(".vertical_distribute")

        SelectedNotes().then((els) => {
            const newEls = [...els]
            const distances = newEls.map((source, index) =>
                index > 0 ? getY(source) - getY(newEls[index - 1]) : undefined,
            )
            expect(
                _.uniq(_.compact(distances)).length,
                "Selected notes should have y coordinates equally spaced",
            ).to.equal(1)
            expect([...els].map(getX), "Selected notes should have original x coordinates").to.deep.equal(originalX)
        })
    })
})
