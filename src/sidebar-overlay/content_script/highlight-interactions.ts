import { highlightAnnotation } from 'src/direct-linking/content_script/rendering'
import { getOffsetTop } from '../utils'
import { Annotation } from 'src/sidebar-common/sidebar/types'

const styles = require('src/direct-linking/content_script/styles.css')

/**
 * Scrolls to the highlight of the given annotation on the current page.
 */
export const scrollToHighlight = ({ url }: Annotation) => {
    const baseClass = styles['memex-highlight']
    const $highlight = document.querySelector(
        `.${baseClass}[data-annotation="${url}"]`,
    )

    if ($highlight) {
        const top =
            getOffsetTop($highlight as HTMLElement) - window.innerHeight / 2
        window.scrollTo({ top, behavior: 'smooth' })
        // The pixels scrolled need to be returned in order to restrict
        // scrolling when mouse is over the sidebar.
        return top
    } else {
        console.error('MEMEX: Oops, no highlight found to scroll to')
    }
}

/**
 * Given an annotation object, highlights that text and removes other highlights
 * from the page.
 * @param {*} annotation Annotation object which has the selector to be highlighted
 */
export const highlightAndScroll = (annotation: Annotation) => {
    removeHighlights(true)
    makeHighlightDark(annotation)
    return scrollToHighlight(annotation)
}

/**
 * Given an array of annotation objects, highlights all of them.
 */
export const highlightAnnotations = async (
    annotations: Annotation[],
    openSidebar: (args: { activeUrl?: string }) => void,
    focusOnAnnotation?: (url: string) => void,
    hoverAnnotationContainer?: (url: string) => void,
) => {
    await Promise.all(
        annotations.map(async annotation =>
            highlightAnnotation(
                { annotation },
                openSidebar,
                focusOnAnnotation,
                hoverAnnotationContainer,
            ),
        ),
    )
}

/**
 * Attaches event listeners to the highlights for hovering/focusing on the
 * annotation in sidebar.
 * @param {Annotation} annotation The annotation to which the listeners are going to be attached
 * @param {function} focusOnAnnotation Function when called will set the sidebar container to active state
 * @param {function} hoverAnnotationContainer Function when called will set the sidebar container to hover state
 */
export const attachEventListenersToNewHighlights = (
    annotation: Annotation,
    focusOnAnnotation: (url: string) => void,
    hoverAnnotationContainer: (url: string) => void,
    openSidebar: (args: { activeUrl?: string }) => void,
) => {
    const newHighlights = document.querySelectorAll(
        `.${styles['memex-highlight']}:not([data-annotation])`,
    )
    newHighlights.forEach(highlight => {
        ;(highlight as HTMLElement).dataset.annotation = annotation.url

        const clickListener = async e => {
            e.preventDefault()
            if (!e.target.dataset.annotation) {
                return
            }
            openSidebar({ activeUrl: annotation.url })
            removeHighlights(true)
            makeHighlightDark(annotation)
            focusOnAnnotation(annotation.url)
        }
        highlight.addEventListener('click', clickListener, false)

        const mouseenterListener = e => {
            if (!e.target.dataset.annotation) {
                return
            }
            removeMediumHighlights()
            makeHighlightMedium(annotation)
            hoverAnnotationContainer(annotation.url)
        }
        highlight.addEventListener('mouseenter', mouseenterListener, false)

        const mouseleaveListener = e => {
            if (!e.target.dataset.annotation) {
                return
            }
            removeMediumHighlights()
            hoverAnnotationContainer(null)
        }
        highlight.addEventListener('mouseleave', mouseleaveListener, false)
    })
}

/**
 * Removes the medium class from all the highlights making them light.
 */
export const removeMediumHighlights = () => {
    // Remove previous "medium" highlights
    const baseClass = styles['memex-highlight']
    const mediumClass = styles['medium']
    const prevHighlights = document.querySelectorAll(
        `.${baseClass}.${mediumClass}`,
    )
    prevHighlights.forEach(highlight => highlight.classList.remove(mediumClass))
}

/**
 * Makes the given annotation as a medium highlight.
 * @param {string} url PK of the annotation to make medium
 */
export const makeHighlightMedium = ({ url }: Annotation) => {
    // Make the current annotation as a "medium" highlight.
    const baseClass = styles['memex-highlight']
    const mediumClass = styles['medium']
    const highlights = document.querySelectorAll(
        `.${baseClass}[data-annotation="${url}"]`,
    )
    highlights.forEach(highlight => highlight.classList.add(mediumClass))
}

/**
 * Makes the highlight a dark highlight.
 */
export const makeHighlightDark = ({ url }: Annotation) => {
    const baseClass = styles['memex-highlight']
    const highlights = document.querySelectorAll(
        `.${baseClass}[data-annotation="${url}"]`,
    )

    highlights.forEach(highlight => {
        highlight.classList.add(styles['dark'])
    })
}

/**
 * Removes all highlight elements in the current page.
 * If `onlyRemoveDarkHighlights` is true, only dark highlights will be removed.
 */
export const removeHighlights = (onlyRemoveDarkHighlights = false) => {
    const baseClass = '.' + styles['memex-highlight']
    const darkClass = onlyRemoveDarkHighlights ? '.' + styles['dark'] : ''
    const highlightClass = `${baseClass}${darkClass}`
    const highlights = document.querySelectorAll(highlightClass)

    if (onlyRemoveDarkHighlights) {
        highlights.forEach(highlight =>
            highlight.classList.remove(styles['dark']),
        )
    } else {
        highlights.forEach(highlight => _removeHighlight(highlight))
    }
}

/**
 * Finds each annotation's position in page, sorts it by the position and
 * returns the sorted annotations.
 */
export const sortAnnotationsByPosition = (annotations: Annotation[]) => {
    const offsetTopObjects = annotations.map((annotation, index) => {
        const firstHighlight = document.querySelector(
            `.${styles['memex-highlight']}[data-annotation="${
                annotation.url
            }"]`,
        )
        return {
            index,
            offsetTop: firstHighlight
                ? getOffsetTop(firstHighlight as HTMLElement)
                : Infinity,
        }
    })

    const sortedOffsetTopObjects = offsetTopObjects.sort(
        (a, b) => a.offsetTop - b.offsetTop,
    )

    return sortedOffsetTopObjects.map(
        offsetTopObject => annotations[offsetTopObject.index],
    )
}

/**
 * Unwraps the `memex-highlight` element from the highlight,
 * resetting the DOM Text to how it was.
 */
const _removeHighlight = (highlight: Element) => {
    const parent = highlight.parentNode
    while (highlight.firstChild) {
        parent.insertBefore(highlight.firstChild, highlight)
    }
    parent.removeChild(highlight)
}

/**
 * Removes all the highlights of a given annotation.
 * Called when the annotation is deleted.
 */
const _removeAnnotationHighlights = ({ url }: Annotation) => {
    const baseClass = styles['memex-highlight']
    const highlights = document.querySelectorAll(
        `.${baseClass}[data-annotation="${url}"]`,
    )
    highlights.forEach(highlight => _removeHighlight(highlight))
}
