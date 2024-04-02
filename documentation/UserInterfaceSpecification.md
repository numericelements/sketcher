# Sketcher - *User Interface Specification*

## Introduction

### Purpose

The purpose of this document is to provide an accurate specification of the **Sketcher** user inteface. These requirements will detail the outwardly observable behavior of the program. The user interface provides the means for you, artistic and technical drafter, to interact with the application. 

The first version of the *User Interface Specification* is intended to convey the general idea for the user interface design and the operational concept of the software. Many details have been omitted for both clarity and because they have not been addressed yet. This document will be updated with additional details as our analysis and design activities progress. 

### Overview

The **Sketcher** application allows you to draw and modify curves. The interface is intended to be minimalist. Available on the web, you can interact with the app with a mouse, a stylus or touchscreen.

### Basic goals

The application is intended to be easy to use and as transparent as possible in terms of its mathematical models. A primary goal is to show the elegance of b-spline theory.

### Using the program - The Big Picture

### Projects

The **Sketcher** application allows you to edit a curve in several ways while controlling the geometric properties of that curve. It also allows you to deform several selected curves at once using general transformations of the plane which preserve specific properties of the curves. The combination of these two types of deformations, local and global, in a fluid manner constitutes the main asset of the software.

## Presentation of the mathematical core
 
The mathematical core of the application rests on the shoulders of giants. Let us think for example of Felix Klein (1849-1925) and Sophius Lie (1842-1899) for the groups of transformations of the plane or Sergei Bernstein (1880-1968) for the Bernstein polynomials and Isaac Jacob Schoenberg (1903-1990) for the splines.These works are at the origin of the rich current literature from wich we draw.

The “analytic-b-spline” package that we plan to publish on npm aims for the analytical processing of b-splines. “Analytic” comes from the same root as “analysis,” which in mathematics loosely means the study of the properties of objects.

In our case, solving an equation analytically amounts to finding a solution simply by exploiting known rules: addition and subtraction, associativity, commutativity, etc.

This differs from a "numeric" solution, in which a sequence of numbers is used and compared to see if equality is met.

### Interaction with geometric elements

When opening the application, a white canvas is displayed. The options are then very limited. A minimalist icon provides access to the application's main menu. The toolbar contains a single pencil.

Without pressing any icon, it is then possible to draw freehand. Pressing the pencil icon brings up the freehand drawing, straight lines and circular arc options.

Clicking on the canvas without moving deselects the drawing icon. No toolbar icon is then selected.

Pressing a curve allows you to move it. The control polygon is displayed when the curve is released.

When no design tool is selected, it is possible to select curves. After selecting a curve the "b" icon for basis function, the up arrow (shift) and trash can icon are displayed. It then becomes possible to switch to multiple selection mode by pressing the shift key or the up arrow icon. In multiple selection, the frame selection icon is also displayed.

When the "b" icon is selected then the basis functions editing window is displayed. A zoom-scrolling button allows you to enlarge and thus better see a particular section of the basis functions in its parametric domain. Touching and moving the basis functions display area allows you to move the function horizontally. The position of the knots is displayed on a bar below. It is possible to move them. Selecting a knot or touching the parametric line first displays a position on the parametric line as well as on the curve. It then becomes possible to insert a knot at this position or to delete a selected knot. The multiplicity of knots is shown using multiple vertical lines under the basis functions.

### Editing goals

To obtain finer control over your curve you will eventually need to insert knots and thus increase the number of control points which allow you to define the shape of your curve. You then have in your hands a curve that becomes more malleable. 

Controlling the number of points of curvature extrema allows you to obtain increasingly malleable curves by inserting knots while imposing a structure that you initially defined and that you wish to preserve. You will be able to explore, for example, spirals and oval shapes in their greatest generality.


### Structural analysis

The application can be in different states. The main states are: Freehand drawing of a curve, drawing of a straight line, drawing of a circular arc, single selection and multiple selection of curves.

In addition to these main states, the main current actions are : no action in progress, drawing of a curve, moving the selected curves, moving a control point.

Sketch elements are stored in a list with a unique identification number. The sketch elements are the different types of b-spline curves and the different types of geometric constraints that can be applied to these b-spline curves.

Each curve contains the list of constraints that apply to itself. If a curve is deleted then all constraints in the list must also be deleted.

## Menus

### Application menus

## Toolbars

### Standard toolbar

### Circle toolbar

The arc icon allows you to draw either an arc or a complete circle. When a circular arc is selected then the toolbar offers the option to close the circle. When a full circle is selected then the toolbar offers the option to open the circle.

The arc of a circle is manipulated using three points. The complete circle is manipulated using a single point. The position of this point allows you to increase the radius of the circle and also gives the position where to open the circle to obtain an arc.

### Toolbar for a B-spline curve

It is possible to close the curve by bringing the ends together. Then nodes are added in order to superpose $d$ nodes where $d$ is the degree of the curve. Multiple nodes must be removed at the junction to increase continuity if necessary.

It is possible to open the curve by inserting enough nodes and then choosing the scissor which is added to the menu.

By default, control over the curvature extrema is active. An icon with a red dot allows you to deactivate the control. The icon is an ellipse with 4 red dots at its curvature extrema. An icon with a blue dot on the inflection of a cubic also allows you to activate control over the inflections.

When two extremum points of curvature come into contact, a red X is added to the superposition. Pressing the icon allows you to delete the curvature extremum point which is in fact already absent but which can reappear at any time since the constraint still allows it.

## Miscelleneous interface elements

### Specification selection

## Glossary of terms

## Special considerations



